"""Client minimal de l'API Groq (compatible OpenAI), sans dépendance ajoutée.

La clé reste côté serveur (GROQ_API_KEY dans .env) : le navigateur ne parle
jamais à Groq directement.
"""
import http.client
import json
import os
import urllib.error
import urllib.request

URL = "https://api.groq.com/openai/v1/chat/completions"
MODELE = "openai/gpt-oss-120b"
DELAI = 45  # secondes


class IaIndisponible(Exception):
    """L'assistant ne peut pas répondre (clé absente, réseau, quota) : message affiché tel quel."""


def completer(messages, *, format_json=False, temperature=0.2, max_tokens=2500):
    """Envoie la conversation et renvoie le texte de la réponse (ou le JSON décodé)."""
    cle = os.getenv("GROQ_API_KEY")
    if not cle:
        raise IaIndisponible("L'assistant IA n'est pas configuré sur ce serveur (clé GROQ_API_KEY absente).")

    corps = {
        "model": os.getenv("GROQ_MODEL", MODELE),
        "messages": messages,
        "temperature": temperature,
        "max_completion_tokens": max_tokens,
        "reasoning_effort": "medium",
    }
    if format_json:
        corps["response_format"] = {"type": "json_object"}

    requete = urllib.request.Request(
        URL,
        data=json.dumps(corps).encode(),
        headers={
            "Authorization": f"Bearer {cle}",
            "Content-Type": "application/json",
            "User-Agent": "MaSante/1.0",
        },
    )
    # Une coupure réseau passagère (connexion fermée, délai) : on réessaie une fois.
    for essai in range(2):
        try:
            with urllib.request.urlopen(requete, timeout=DELAI) as reponse:
                donnees = json.load(reponse)
            break
        except urllib.error.HTTPError as erreur:
            if erreur.code == 429:
                raise IaIndisponible("L'assistant IA est très sollicité. Réessayez dans une minute.") from erreur
            if erreur.code >= 500 and essai == 0:
                continue
            raise IaIndisponible("L'assistant IA a refusé la demande. Réessayez.") from erreur
        except (urllib.error.URLError, http.client.HTTPException, OSError, ValueError) as erreur:
            if essai == 0:
                continue
            raise IaIndisponible("L'assistant IA est injoignable. Vérifiez la connexion Internet du serveur.") from erreur

    texte = (donnees.get("choices") or [{}])[0].get("message", {}).get("content") or ""
    if not format_json:
        return texte.strip()
    try:
        return json.loads(texte)
    except json.JSONDecodeError as erreur:
        raise IaIndisponible("L'assistant IA a répondu dans un format inattendu. Réessayez.") from erreur
