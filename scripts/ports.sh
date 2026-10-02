# MA SANTÉ — fonctions partagées par les commandes « backend » et « frontend ».

# Processus qui écoutent sur un port (seuls ceux de l'utilisateur courant sont visibles).
pids_du_port() {
  ss -ltnpH "sport = :$1" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u
}

port_occupe() {
  ss -ltnH "sport = :$1" 2>/dev/null | grep -q .
}

# Libère le port : arrête proprement ce qui l'occupe (et le surveillant qui le relancerait),
# puis force l'arrêt au bout de 5 secondes.
liberer_port() {
  local port="$1" pids pid parent cibles=""
  port_occupe "$port" || return 0
  pids="$(pids_du_port "$port")"
  if [ -z "$pids" ]; then
    echo "Le port $port est tenu par un programme d'un autre utilisateur : arrêtez-le avec sudo." >&2
    return 1
  fi
  for pid in $pids; do
    cibles="$cibles $pid"
    # Django (rechargement automatique) et npm lancent le serveur depuis un processus parent.
    parent="$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')"
    if [ -n "$parent" ] && ps -o args= -p "$parent" 2>/dev/null | grep -qE "manage.py runserver|vite|npm"; then
      cibles="$cibles $parent"
    fi
  done
  echo "Port $port occupé : arrêt de $(ps -o comm= -p ${pids%% *} 2>/dev/null || echo 'programme') (pid$cibles)."
  kill $cibles 2>/dev/null || true
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    port_occupe "$port" || { echo "Port $port libéré."; return 0; }
    sleep 0.5
  done
  kill -9 $cibles 2>/dev/null || true
  sleep 0.5
  if port_occupe "$port"; then
    echo "Impossible de libérer le port $port." >&2
    return 1
  fi
  echo "Port $port libéré (arrêt forcé)."
}
