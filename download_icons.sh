#!/bin/bash
set -e

mkdir -p app/public/icons

declare -A icons=(
    ["sword_wood"]="Wooden_Sword"
    ["sword_stone"]="Stone_Sword"
    ["sword_iron"]="Iron_Sword"
    ["sword_gold"]="Golden_Sword"
    ["sword_diamond"]="Diamond_Sword"
    ["helmet_leather"]="Leather_Cap"
    ["helmet_iron"]="Iron_Helmet"
    ["helmet_diamond"]="Diamond_Helmet"
    ["chest_leather"]="Leather_Tunic"
    ["chest_iron"]="Iron_Chestplate"
    ["chest_diamond"]="Diamond_Chestplate"
    ["legs_leather"]="Leather_Pants"
    ["legs_iron"]="Iron_Leggings"
    ["legs_diamond"]="Diamond_Leggings"
    ["boots_leather"]="Leather_Boots"
    ["boots_iron"]="Iron_Boots"
    ["boots_diamond"]="Diamond_Boots"
    ["food_bread"]="Bread"
    ["food_steak"]="Steak"
    ["food_golden_apple"]="Golden_Apple"
)

# Some items use different filenames for Invicons
icons["food_steak"]="Cooked_Beef"

for key in "${!icons[@]}"; do
    wiki_name="${icons[$key]}"
    # Let's try downloading the Invicon first, if not try regular image
    url="https://minecraft.wiki/images/Invicon_${wiki_name}.png"
    echo "Downloading ${wiki_name}..."
    if ! curl -sL "$url" -H "User-Agent: Mozilla/5.0" -f -o "app/public/icons/${key}.png"; then
        echo "Trying fallback for ${wiki_name}..."
        fallback_url="https://minecraft.wiki/images/${wiki_name}.png"
        curl -sL "$fallback_url" -H "User-Agent: Mozilla/5.0" -f -o "app/public/icons/${key}.png" || echo "❌ Failed ${wiki_name}"
    else
        echo "✅ Downloaded ${wiki_name}"
    fi
done

# Adjust for some specific edge cases if they fail
