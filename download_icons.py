import subprocess
import re
import os

items = {
    "sword_wood": "Wooden_Sword",
    "sword_stone": "Stone_Sword",
    "sword_iron": "Iron_Sword",
    "sword_gold": "Golden_Sword",
    "sword_diamond": "Diamond_Sword",
    "helmet_leather": "Leather_Cap",
    "helmet_iron": "Iron_Helmet",
    "helmet_diamond": "Diamond_Helmet",
    "chest_leather": "Leather_Tunic",
    "chest_iron": "Iron_Chestplate",
    "chest_diamond": "Diamond_Chestplate",
    "legs_leather": "Leather_Pants",
    "legs_iron": "Iron_Leggings",
    "legs_diamond": "Diamond_Leggings",
    "boots_leather": "Leather_Boots",
    "boots_iron": "Iron_Boots",
    "boots_diamond": "Diamond_Boots",
    "food_bread": "Bread",
    "food_steak": "Steak",
    "food_golden_apple": "Golden_Apple",
}

page_overrides = {
    "Steak": "Cooked_Beef",
}

skins = ["steve", "alex", "ari", "kai", "zuri", "makena", "efe", "noor"]

sounds = {
    "Click.ogg": "https://minecraft.wiki/images/Click.ogg",
    "Level_up.ogg": "https://minecraft.wiki/images/Random_levelup.ogg",
}

def fetch_html_curl(url):
    try:
        result = subprocess.run(
            ["curl", "-sL", url, "-H", "User-Agent: Mozilla/5.0"],
            capture_output=True, text=True, check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error fetching HTML from {url}: {e}")
        return ""

def download_file_curl(url, out_path):
    try:
        subprocess.run(
            ["curl", "-sL", url, "-H", "User-Agent: Mozilla/5.0", "-o", out_path],
            check=True, capture_output=True
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error downloading {url} to {out_path}: {e}")
        return False

os.makedirs("app/public/icons", exist_ok=True)
os.makedirs("app/public/sounds", exist_ok=True)

print("--- 1. Downloading High-Res Item Icons (via curl subprocess) ---")
for key, wiki_name in items.items():
    page_name = page_overrides.get(wiki_name, wiki_name)
    url = f"https://minecraft.wiki/w/{page_name}"
    html = fetch_html_curl(url)
    
    match = re.search(r'src="(/images/[^"]+)"[^>]*data-file-width="160"', html)
    if not match:
        match = re.search(r'class="infobox-imagearea[^>]*>.*?src="(/images/[^"]+)"', html, re.DOTALL)
    if not match:
        pattern = f'src="(/images/{wiki_name}[^"]*)"'
        match = re.search(pattern, html, re.IGNORECASE)
    
    if match:
        img_url = "https://minecraft.wiki" + match.group(1).replace("&amp;", "&")
        out_path = f"app/public/icons/{key}.png"
        if download_file_curl(img_url, out_path):
            print(f"✅ [Item] {key}")
        else:
            print(f"❌ [Item] {key} failed")
    else:
        print(f"❌ [Item] {key} image URL not found")

print("\n--- 2. Downloading Player Avatars ---")
for skin in skins:
    url = f"https://minecraft.wiki/images/EntitySprite_{skin}.png"
    out_path = f"app/public/icons/EntitySprite_{skin}.png"
    if download_file_curl(url, out_path):
        print(f"✅ [Avatar] {skin}")
    else:
        print(f"❌ [Avatar] {skin}")

print("\n--- 3. Downloading Sounds ---")
for name, url in sounds.items():
    out_path = f"app/public/sounds/{name}"
    if download_file_curl(url, out_path):
        print(f"✅ [Sound] {name}")
    else:
        print(f"❌ [Sound] {name}")

print("\nDone!")
