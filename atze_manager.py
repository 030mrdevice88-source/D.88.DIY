import os
import requests
from bs4 import BeautifulSoup

class AtzeManager:
    def __init__(self):
        self.user_agent = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com)'
        self.headers = {
            'User-Agent': self.user_agent,
            'Referer': 'https://www.google.com'
        }
        self.vault_path = "/vault/memories"
        if not os.path.exists(self.vault_path):
            os.makedirs(self.vault_path)

    def extract_content(self, url):
        try:
            # Stufe 1: User-Agent Spoofing
            response = requests.get(url, headers=self.headers, timeout=10)
            
            # Stufe 2: JavaScript-Stripping (BS4 handles static content)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove scripts and styles
            for script in soup(["script", "style"]):
                script.decompose()

            # Get text
            text = soup.get_text()
            
            # Clean up text
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            clean_text = '\n'.join(chunk for chunk in chunks if chunk)

            # Save to vault
            filename = f"atze_{url.replace('https://', '').replace('http://', '').replace('/', '_')}.md"
            filepath = os.path.join(self.vault_path, filename)
            
            with open(filepath, "w") as f:
                f.write(f"# Extracted Content from {url}\n\n")
                f.write(clean_text)

            return {
                "status": "success",
                "content": clean_text[:1000] + "...",
                "filepath": filepath
            }
        except Exception as e:
            return {"status": "error", "detail": str(e)}

    def get_bypass_rules(self):
        rules_path = "/vault/skills/bypass_rules.md"
        if os.path.exists(rules_path):
            with open(rules_path, "r") as f:
                return f.read()
        return "Keine Regeln gefunden."
