"""Connecteur vers le logiciel d'archivage externe.

Le logiciel n'est pas encore choisi : son API arrivera plus tard. Tout ce que
la GED attend de lui tient dans la classe Connecteur ci-dessous. Le jour où
l'API est connue, on écrit une sous-classe (envoyer, rechercher, telecharger)
et on la désigne dans .env :

    GED_CONNECTEUR=ged.connecteurs_externes.MonLogiciel

Les écrans, les fiches et la recherche n'ont rien à changer : un document
distant est une fiche comme une autre, avec `stockage = "distant"`.
"""
import importlib
import os


class ConnecteurIndisponible(Exception):
    """Le logiciel externe ne répond pas, ou n'est pas branché : message affiché tel quel."""


class Connecteur:
    """Aucun logiciel externe : tout reste sur le serveur du centre."""

    nom = "Aucun (stockage sur le serveur du centre)"
    actif = False

    def envoyer(self, document):
        """Dépose le fichier dans le logiciel externe ; renvoie sa référence là-bas."""
        raise ConnecteurIndisponible("Aucun logiciel d'archivage n'est encore branché.")

    def rechercher(self, *, numero="", nom="", prenoms=""):
        """Documents que le logiciel externe détient sur ce patient.

        Renvoie une liste de dicts : { reference, titre, type, date, url? }.
        """
        return []

    def telecharger(self, reference):
        """(contenu en octets, type MIME, nom de fichier) d'un document distant."""
        raise ConnecteurIndisponible("Aucun logiciel d'archivage n'est encore branché.")


def connecteur():
    chemin = os.getenv("GED_CONNECTEUR", "").strip()
    if not chemin:
        return Connecteur()
    module, _, classe = chemin.rpartition(".")
    return getattr(importlib.import_module(module), classe)()
