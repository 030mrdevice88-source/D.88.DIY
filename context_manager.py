import os
from datetime import datetime

class ContextManager:
    def __init__(self, vault_path="./vault"):
        self.vault = vault_path
        self._ensure_structure()

    def _ensure_structure(self):
        """Erstellt die notwendige Ordnerstruktur."""
        categories = ["memories", "skills", "libs", "urls"]
        if not os.path.exists(self.vault):
            os.makedirs(self.vault)
        for cat in categories:
            cat_path = os.path.join(self.vault, cat)
            if not os.path.exists(cat_path):
                os.makedirs(cat_path)

    def save_knowledge(self, category, title, content):
        """Speichert neues Wissen als Markdown-Punkt."""
        if category not in ["memories", "skills", "libs", "urls"]:
            raise ValueError("Ungültige Kategorie")
            
        filename = f"{title.replace(' ', '_')}.md"
        path = os.path.join(self.vault, category, filename)
        
        with open(path, "w", encoding="utf-8") as f:
            f.write(f"# {title}\nDate: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n{content}")
        return path

    def query_context(self, query):
        """Durchsucht lokal alle Markdown-Dateien nach Relevanz."""
        results = []
        query_lower = query.lower()
        
        for root, dirs, files in os.walk(self.vault):
            for file in files:
                if file.endswith(".md"):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            content = f.read()
                            if query_lower in content.lower():
                                # Extrahiere Kategorie aus dem Pfad
                                category = os.path.basename(root)
                                results.append({
                                    "path": file_path,
                                    "title": file.replace(".md", "").replace("_", " "),
                                    "category": category,
                                    "snippet": self._extract_snippet(content, query_lower)
                                })
                    except Exception as e:
                        print(f"Fehler beim Lesen von {file_path}: {e}")
        return results

    def _extract_snippet(self, content, query):
        """Extrahiert einen relevanten Ausschnitt (Markdown-Compression)."""
        lines = content.split('\n')
        relevant_lines = []
        for line in lines:
            if query in line.lower() or line.startswith('#'):
                relevant_lines.append(line)
        return "\n".join(relevant_lines[:5]) # Max 5 Zeilen für die Vorschau

if __name__ == "__main__":
    # Test
    cm = ContextManager()
    cm.save_knowledge("libs", "Fastboot Commands", "Fastboot flash recovery recovery.img\nFastboot reboot")
    print(cm.query_context("Fastboot"))
