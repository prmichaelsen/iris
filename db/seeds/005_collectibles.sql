-- Seed Data: Collectibles
-- Created: 2026-04-27
-- Description: Sample collectible items from pen pals and regions

-- ============================================
-- MILA'S COLLECTIBLES (Berlin Artist)
-- ============================================

INSERT INTO collectibles (id, name_de, name_en, category, pen_pal_id, region_id, rarity, description_de, description_en, metadata) VALUES
  ('collect_mila_sticker_apfel', 'Der Apfel', 'The Apple', 'sticker', 'penpal_mila', 'region_berlin', 'common', 'Streetart-Sticker mit einem bunten Apfel', 'Street art sticker with a colorful apple', '{"artist": "Mila", "theme": "fruit"}'),
  ('collect_mila_sticker_fernsehturm', 'Fernsehturm', 'TV Tower', 'sticker', 'penpal_mila', 'region_berlin', 'uncommon', 'Ikonischer Berliner Fernsehturm im Pop-Art-Stil', 'Iconic Berlin TV tower in pop art style', '{"artist": "Mila", "theme": "berlin_landmarks"}'),
  ('collect_mila_sticker_bear', 'Berliner Bär', 'Berlin Bear', 'sticker', 'penpal_mila', 'region_berlin', 'rare', 'Graffiti-Stil Berliner Bär mit Spraydose', 'Graffiti style Berlin bear with spray can', '{"artist": "Mila", "theme": "berlin_symbol"}'),
  ('collect_mila_gallery_invite', 'Galerie-Einladung', 'Gallery Invitation', 'postcard', 'penpal_mila', 'region_berlin', 'legendary', 'Handgeschriebene Einladung zu Milas Galerie-Eröffnung', 'Handwritten invitation to Mila''s gallery opening', '{"event": "gallery_opening", "exclusive": true}');

-- ============================================
-- LENA'S COLLECTIBLES (Hamburg DJ)
-- ============================================

INSERT INTO collectibles (id, name_de, name_en, category, pen_pal_id, region_id, rarity, description_de, description_en, metadata) VALUES
  ('collect_lena_vinyl_ame', 'Âme Vinyl', 'Âme Vinyl Record', 'vinyl_record', 'penpal_lena', 'region_hamburg', 'rare', 'Original Âme Vinyl aus Lenas Sammlung', 'Original Âme vinyl from Lena''s collection', '{"artist": "Âme", "album": "Dream House", "condition": "mint"}'),
  ('collect_lena_vinyl_modeselektor', 'Modeselektor Vinyl', 'Modeselektor Vinyl', 'vinyl_record', 'penpal_lena', 'region_hamburg', 'rare', 'Modeselektor Vinyl mit Autogramm', 'Modeselektor vinyl with signature', '{"artist": "Modeselektor", "signed": true}'),
  ('collect_lena_harbor_photo', 'Hafen bei Sonnenaufgang', 'Harbor at Sunrise', 'photo_print', 'penpal_lena', 'region_hamburg', 'uncommon', 'Lenas Lieblingsfoto vom Hamburger Hafen', 'Lena''s favorite photo of Hamburg harbor', '{"location": "Hamburg Harbor", "time": "sunrise"}'),
  ('collect_lena_backstage_pass', 'Backstage-Pass', 'Backstage Pass', 'badge', 'penpal_lena', 'region_hamburg', 'legendary', 'VIP-Pass für einen von Lenas DJ-Sets', 'VIP pass for one of Lena''s DJ sets', '{"venue": "Hafenklang", "exclusive": true}');

-- ============================================
-- THOMAS'S COLLECTIBLES (Bavaria Mountain Guide)
-- ============================================

INSERT INTO collectibles (id, name_de, name_en, category, pen_pal_id, region_id, rarity, description_de, description_en, metadata) VALUES
  ('collect_thomas_pressed_flower_1', 'Alpen-Edelweiß', 'Alpine Edelweiss', 'pressed_flower', 'penpal_thomas', 'region_bavaria', 'uncommon', 'Gepresstes Edelweiß aus den bayerischen Alpen', 'Pressed edelweiss from the Bavarian Alps', '{"altitude": "2100m", "location": "Zugspitze"}'),
  ('collect_thomas_pressed_flower_2', 'Enzian', 'Gentian', 'pressed_flower', 'penpal_thomas', 'region_bavaria', 'uncommon', 'Blauer Enzian aus der Bergwiese', 'Blue gentian from mountain meadow', '{"altitude": "1800m"}'),
  ('collect_thomas_summit_certificate', 'Gipfelzertifikat', 'Summit Certificate', 'certificate', 'penpal_thomas', 'region_bavaria', 'rare', 'Zertifikat für erfolgreiche Gipfelbesteigung', 'Certificate for successful summit', '{"mountain": "Zugspitze", "elevation": "2962m"}'),
  ('collect_thomas_mountain_map', 'Alte Bergkarte', 'Old Mountain Map', 'map', 'penpal_thomas', 'region_bavaria', 'legendary', 'Handgezeichnete Karte der bayerischen Alpen', 'Hand-drawn map of Bavarian Alps', '{"era": "1950s", "hand_drawn": true}');

-- ============================================
-- KLAUS'S COLLECTIBLES (Rhine Valley Winemaker)
-- ============================================

INSERT INTO collectibles (id, name_de, name_en, category, pen_pal_id, region_id, rarity, description_de, description_en, metadata) VALUES
  ('collect_klaus_wine_label_1', 'Riesling 2019', 'Riesling 2019 Label', 'wine_label', 'penpal_klaus', 'region_rhine_valley', 'uncommon', 'Etikett von Klaus'' preisgekröntem Riesling', 'Label from Klaus''s award-winning Riesling', '{"vintage": 2019, "grape": "Riesling", "award": "Gold Medal"}'),
  ('collect_klaus_wine_label_2', 'Spätburgunder 2018', 'Pinot Noir 2018 Label', 'wine_label', 'penpal_klaus', 'region_rhine_valley', 'rare', 'Limitierter Spätburgunder aus dem Familienweinberg', 'Limited Pinot Noir from family vineyard', '{"vintage": 2018, "grape": "Spätburgunder", "limited": true}'),
  ('collect_klaus_cork', 'Weinkorken', 'Wine Cork', 'cork', 'penpal_klaus', 'region_rhine_valley', 'common', 'Korken von einem besonderen Jahrgang', 'Cork from a special vintage', '{"vintage": 2015}'),
  ('collect_klaus_cellar_key', 'Kellerschlüssel', 'Cellar Key', 'key', 'penpal_klaus', 'region_rhine_valley', 'legendary', 'Alter Schlüssel zum privaten Weinkeller', 'Old key to private wine cellar', '{"access": "private_cellar", "exclusive": true}');

-- ============================================
-- GRETA'S COLLECTIBLES (Black Forest Folklorist)
-- ============================================

INSERT INTO collectibles (id, name_de, name_en, category, pen_pal_id, region_id, rarity, description_de, description_en, metadata) VALUES
  ('collect_greta_leaf_oak', 'Eichenblatt', 'Oak Leaf', 'pressed_leaf', 'penpal_greta', 'region_black_forest', 'common', 'Gepresstes Eichenblatt aus dem Schwarzwald', 'Pressed oak leaf from Black Forest', '{"tree_age": "300+ years"}'),
  ('collect_greta_leaf_beech', 'Buchenblatt', 'Beech Leaf', 'pressed_leaf', 'penpal_greta', 'region_black_forest', 'common', 'Gepresstes Buchenblatt im Herbst', 'Pressed beech leaf in autumn', '{"season": "autumn"}'),
  ('collect_greta_story_scroll', 'Märchenrolle', 'Fairy Tale Scroll', 'scroll', 'penpal_greta', 'region_black_forest', 'rare', 'Handgeschriebene alte Schwarzwald-Sage', 'Handwritten old Black Forest tale', '{"tale": "Der Glasmännlein", "handwritten": true}'),
  ('collect_greta_forest_charm', 'Waldzauber-Amulett', 'Forest Charm', 'charm', 'penpal_greta', 'region_black_forest', 'legendary', 'Traditionelles Schutzamulett aus dem Schwarzwald', 'Traditional protective charm from Black Forest', '{"tradition": "forest_magic", "blessed": true}');

-- ============================================
-- KARL'S COLLECTIBLES (Saxony Historian)
-- ============================================

INSERT INTO collectibles (id, name_de, name_en, category, pen_pal_id, region_id, rarity, description_de, description_en, metadata) VALUES
  ('collect_karl_ddr_stamp', 'DDR-Briefmarke', 'GDR Stamp', 'stamp', 'penpal_karl', 'region_saxony', 'uncommon', 'Originale Briefmarke aus der DDR-Zeit', 'Original stamp from GDR era', '{"year": 1985, "series": "Architecture"}'),
  ('collect_karl_berlin_wall', 'Mauerstück', 'Berlin Wall Piece', 'stone_fragment', 'penpal_karl', 'region_saxony', 'rare', 'Kleines Stück der Berliner Mauer', 'Small piece of the Berlin Wall', '{"year": 1989, "authenticated": true}'),
  ('collect_karl_newspaper', 'Historische Zeitung', 'Historic Newspaper', 'newspaper', 'penpal_karl', 'region_saxony', 'rare', 'Zeitung vom Tag der Wiedervereinigung', 'Newspaper from Reunification Day', '{"date": "1990-10-03", "headline": "Deutschland ist wieder eins"}'),
  ('collect_karl_museum_pass', 'Museums-Pass', 'Museum Pass', 'pass', 'penpal_karl', 'region_saxony', 'legendary', 'Lebenslanger Pass für Dresdner Museen', 'Lifetime pass for Dresden museums', '{"museums": "all_dresden", "lifetime": true}');

-- ============================================
-- ANNA'S COLLECTIBLES (Vienna Café Owner)
-- ============================================

INSERT INTO collectibles (id, name_de, name_en, category, pen_pal_id, region_id, rarity, description_de, description_en, metadata) VALUES
  ('collect_anna_coffee_tin', 'Kaffeebüchse', 'Coffee Tin', 'tin', 'penpal_anna', 'region_austria', 'uncommon', 'Vintage Wiener Kaffeerösterei-Dose', 'Vintage Viennese coffee roaster tin', '{"roaster": "Julius Meinl", "era": "1960s"}'),
  ('collect_anna_opera_ticket', 'Opernkarte', 'Opera Ticket', 'ticket_stub', 'penpal_anna', 'region_austria', 'rare', 'Karte für die Wiener Staatsoper', 'Ticket for Vienna State Opera', '{"opera": "Die Zauberflöte", "date": "2026-03-15"}'),
  ('collect_anna_sachertorte_recipe', 'Sachertorten-Rezept', 'Sachertorte Recipe', 'recipe_card', 'penpal_anna', 'region_austria', 'rare', 'Geheimes Familienrezept für Sachertorte', 'Secret family recipe for Sachertorte', '{"handwritten": true, "exclusive": true}'),
  ('collect_anna_cafe_key', 'Café-Schlüssel', 'Café Key', 'key', 'penpal_anna', 'region_austria', 'legendary', 'Schlüssel zu Annas Café für Frühöffnung', 'Key to Anna''s café for early access', '{"perk": "free_coffee", "lifetime": true}');

-- ============================================
-- LUKAS'S COLLECTIBLES (Swiss Guide)
-- ============================================

INSERT INTO collectibles (id, name_de, name_en, category, pen_pal_id, region_id, rarity, description_de, description_en, metadata) VALUES
  ('collect_lukas_swiss_chocolate', 'Schweizer Schokolade', 'Swiss Chocolate', 'chocolate_wrapper', 'penpal_lukas', 'region_switzerland', 'common', 'Wrapper von premium Schweizer Schokolade', 'Wrapper from premium Swiss chocolate', '{"brand": "Lindt", "type": "Excellence"}'),
  ('collect_lukas_hiking_badge', 'Wanderabzeichen', 'Hiking Badge', 'badge', 'penpal_lukas', 'region_switzerland', 'uncommon', 'Abzeichen für erfolgreiche Schweizer Alpentouren', 'Badge for completed Swiss Alpine tours', '{"tours": 10, "difficulty": "advanced"}'),
  ('collect_lukas_alpine_horn', 'Mini-Alphorn', 'Mini Alpine Horn', 'miniature', 'penpal_lukas', 'region_switzerland', 'rare', 'Handgeschnitztes Mini-Alphorn', 'Hand-carved mini alpine horn', '{"material": "wood", "handmade": true}'),
  ('collect_lukas_mountain_pass', 'Bergpass', 'Mountain Pass', 'pass', 'penpal_lukas', 'region_switzerland', 'legendary', 'VIP-Pass für alle Schweizer Bergbahnen', 'VIP pass for all Swiss mountain railways', '{"access": "all_mountains", "lifetime": true}');
