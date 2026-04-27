-- Seed Data: Fotos
-- Created: 2026-04-27
-- Description: Sample photo collection items for regions

-- ============================================
-- BERLIN FOTOS
-- ============================================

INSERT INTO fotos (id, title_de, title_en, caption_de, caption_en, category, region_id, tier, generation_prompt) VALUES
  ('foto_berlin_brandenburger_tor', 'Brandenburger Tor bei Sonnenaufgang', 'Brandenburg Gate at Sunrise', 'Das ikonische Wahrzeichen im goldenen Morgenlicht', 'The iconic landmark in golden morning light', 'orte', 'region_berlin', 1, 'Photorealistic film photography of Brandenburg Gate at sunrise, golden hour lighting, few people, dramatic sky, 35mm film aesthetic'),
  ('foto_berlin_street_musician', 'Straßenmusikant in Kreuzberg', 'Street Musician in Kreuzberg', 'Ein Saxophonist spielt Jazz auf der Straße', 'A saxophonist playing jazz on the street', 'menschen', 'region_berlin', 1, 'Photorealistic film photography of street musician with saxophone in Kreuzberg Berlin, candid moment, urban setting, warm afternoon light'),
  ('foto_berlin_currywurst', 'Currywurst mit Pommes', 'Currywurst with Fries', 'Berlins klassisches Streetfood', 'Berlin''s classic street food', 'essen_trinken', 'region_berlin', 1, 'Photorealistic overhead food photography of Currywurst with fries on paper tray, authentic Berlin street food stand, rich colors'),
  ('foto_berlin_east_side_gallery', 'Graffiti an der East Side Gallery', 'Graffiti at East Side Gallery', 'Bunte Kunst auf historischer Mauer', 'Colorful art on historic wall', 'kultur', 'region_berlin', 2, 'Photorealistic film photography of vibrant graffiti art on Berlin Wall, East Side Gallery, blue sky, detailed street art'),
  ('foto_berlin_tv_tower_night', 'Fernsehturm bei Nacht', 'TV Tower at Night', 'Berliner Wahrzeichen erleuchtet', 'Berlin landmark illuminated', 'orte', 'region_berlin', 2, 'Photorealistic long exposure night photography of Berlin TV Tower illuminated against dark sky, city lights, dramatic'),
  ('foto_berlin_jazz_club', 'Jazzclub Quasimodo', 'Jazz Club Quasimodo', 'Intime Atmosphäre im legendären Club', 'Intimate atmosphere in legendary club', 'kultur', 'region_berlin', 3, 'Photorealistic film photography of intimate jazz club interior, dim warm lighting, musicians on stage, cozy atmosphere'),
  ('foto_berlin_berghain_exterior', 'Berghain Außenansicht', 'Berghain Exterior', 'Das legendäre Kraftwerk', 'The legendary power plant', 'orte', 'region_berlin', 4, 'Photorealistic film photography of Berghain exterior, industrial brutalist architecture, moody overcast sky, Berlin techno temple');

-- ============================================
-- BAVARIA FOTOS
-- ============================================

INSERT INTO fotos (id, title_de, title_en, caption_de, caption_en, category, region_id, tier, generation_prompt) VALUES
  ('foto_bavaria_neuschwanstein', 'Schloss Neuschwanstein', 'Neuschwanstein Castle', 'Märchenschloss in den Alpen', 'Fairy tale castle in the Alps', 'orte', 'region_bavaria', 1, 'Photorealistic film photography of Neuschwanstein Castle in Bavarian Alps, misty mountains, fairy tale aesthetic, golden hour'),
  ('foto_bavaria_beer_garden', 'Biergarten im Sommer', 'Beer Garden in Summer', 'Gemütliches Zusammensein unter Kastanienbäumen', 'Cozy gathering under chestnut trees', 'kultur', 'region_bavaria', 1, 'Photorealistic film photography of traditional Bavarian beer garden, people at wooden tables, chestnut trees, sunny summer day'),
  ('foto_bavaria_pretzel', 'Frische Brezeln', 'Fresh Pretzels', 'Warm aus dem Ofen', 'Warm from the oven', 'essen_trinken', 'region_bavaria', 1, 'Photorealistic close-up food photography of fresh Bavarian pretzels, steam rising, golden brown, rustic wooden board'),
  ('foto_bavaria_mountain_peak', 'Zugspitze Gipfel', 'Zugspitze Summit', 'Deutschlands höchster Punkt', 'Germany''s highest point', 'orte', 'region_bavaria', 2, 'Photorealistic panoramic photography of Zugspitze summit, snow-capped peaks, dramatic alpine landscape, clear blue sky'),
  ('foto_bavaria_oktoberfest', 'Oktoberfest', 'Oktoberfest', 'Weltgrößtes Volksfest', 'World''s largest folk festival', 'kultur', 'region_bavaria', 2, 'Photorealistic film photography of Oktoberfest beer tent interior, festive atmosphere, traditional costumes, warm lighting');

-- ============================================
-- HAMBURG FOTOS
-- ============================================

INSERT INTO fotos (id, title_de, title_en, caption_de, caption_en, category, region_id, tier, generation_prompt) VALUES
  ('foto_hamburg_harbor_sunrise', 'Hafen bei Sonnenaufgang', 'Harbor at Sunrise', 'Containerschiffe im Morgenlicht', 'Container ships in morning light', 'orte', 'region_hamburg', 1, 'Photorealistic film photography of Hamburg harbor at sunrise, container ships silhouetted, golden light reflecting on water, industrial beauty'),
  ('foto_hamburg_fish_market', 'Fischmarkt', 'Fish Market', 'Frischer Fang am Morgen', 'Fresh catch in the morning', 'kultur', 'region_hamburg', 1, 'Photorealistic documentary photography of Hamburg fish market, vendors with fresh seafood, bustling morning atmosphere'),
  ('foto_hamburg_fischbrotchen', 'Fischbrötchen', 'Fish Sandwich', 'Nordisches Streetfood', 'Northern street food', 'essen_trinken', 'region_hamburg', 1, 'Photorealistic food photography of Fischbrötchen fish sandwich, fresh herring, rustic presentation, harbor background'),
  ('foto_hamburg_speicherstadt', 'Speicherstadt', 'Warehouse District', 'Historische Backsteinarchitektur', 'Historic brick architecture', 'orte', 'region_hamburg', 2, 'Photorealistic film photography of Hamburg Speicherstadt warehouse district, red brick buildings, canal reflections, moody sky'),
  ('foto_hamburg_elbphilharmonie', 'Elbphilharmonie Dach', 'Elbphilharmonie Roof', 'Panoramablick über den Hafen', 'Panoramic view over harbor', 'orte', 'region_hamburg', 3, 'Photorealistic panoramic photography from Elbphilharmonie rooftop, Hamburg harbor view, modern architecture, sunset light');

-- ============================================
-- RHINE VALLEY FOTOS
-- ============================================

INSERT INTO fotos (id, title_de, title_en, caption_de, caption_en, category, region_id, tier, generation_prompt) VALUES
  ('foto_rhine_vineyard', 'Weinberg am Rhein', 'Vineyard on the Rhine', 'Reben in Terrassenform', 'Terraced grape vines', 'orte', 'region_rhine_valley', 1, 'Photorealistic film photography of Rhine Valley vineyard terraces, rolling hills, river in distance, golden autumn light'),
  ('foto_rhine_castle', 'Burg Eltz', 'Eltz Castle', 'Mittelalterliche Burg im Nebel', 'Medieval castle in fog', 'orte', 'region_rhine_valley', 1, 'Photorealistic film photography of Eltz Castle surrounded by forest and morning fog, fairy tale medieval architecture, dreamy atmosphere'),
  ('foto_rhine_wine_cellar', 'Weinkeller', 'Wine Cellar', 'Jahrhundertealte Fässer', 'Century-old barrels', 'kultur', 'region_rhine_valley', 2, 'Photorealistic interior photography of traditional wine cellar, oak barrels, dim atmospheric lighting, stone walls'),
  ('foto_rhine_riesling', 'Riesling im Glas', 'Riesling in Glass', 'Goldener Wein im Sonnenlicht', 'Golden wine in sunlight', 'essen_trinken', 'region_rhine_valley', 2, 'Photorealistic wine photography of Riesling in glass with vineyard background, golden hour backlight, elegant composition'),
  ('foto_rhine_private_cellar', 'Privater Weinkeller', 'Private Wine Cellar', 'Exklusiver Zugang', 'Exclusive access', 'kultur', 'region_rhine_valley', 4, 'Photorealistic interior photography of exclusive private wine cellar, rare vintages, atmospheric candle lighting, intimate setting');

-- ============================================
-- BLACK FOREST FOTOS
-- ============================================

INSERT INTO fotos (id, title_de, title_en, caption_de, caption_en, category, region_id, tier, generation_prompt) VALUES
  ('foto_black_forest_trees', 'Dichter Wald', 'Dense Forest', 'Mystische Atmosphäre zwischen Tannen', 'Mystical atmosphere among firs', 'orte', 'region_black_forest', 1, 'Photorealistic film photography of dense Black Forest, tall fir trees, misty atmospheric light filtering through, mysterious mood'),
  ('foto_black_forest_cuckoo', 'Kuckucksuhr', 'Cuckoo Clock', 'Traditionelles Handwerk', 'Traditional craftsmanship', 'kultur', 'region_black_forest', 1, 'Photorealistic product photography of traditional Black Forest cuckoo clock, intricate wood carving, warm lighting'),
  ('foto_black_forest_cake', 'Schwarzwälder Kirschtorte', 'Black Forest Cake', 'Schichten aus Schokolade und Kirschen', 'Layers of chocolate and cherries', 'essen_trinken', 'region_black_forest', 1, 'Photorealistic food photography of Black Forest cake slice, rich chocolate layers, whipped cream, cherry garnish, rustic presentation'),
  ('foto_black_forest_waterfall', 'Wasserfall', 'Waterfall', 'Verstecktes Naturjuwel', 'Hidden natural gem', 'orte', 'region_black_forest', 2, 'Photorealistic long exposure photography of Black Forest waterfall, mossy rocks, lush green forest, silky water flow'),
  ('foto_black_forest_fairy_tale', 'Märchenwald', 'Fairy Tale Forest', 'Wo die Geschichten leben', 'Where stories come alive', 'orte', 'region_black_forest', 3, 'Photorealistic film photography of enchanted Black Forest scene, twisted trees, magical light rays, fairy tale atmosphere');

-- ============================================
-- SAXONY FOTOS
-- ============================================

INSERT INTO fotos (id, title_de, title_en, caption_de, caption_en, category, region_id, tier, generation_prompt) VALUES
  ('foto_saxony_dresden', 'Dresdner Frauenkirche', 'Dresden Frauenkirche', 'Wiederaufgebautes Wahrzeichen', 'Rebuilt landmark', 'orte', 'region_saxony', 1, 'Photorealistic film photography of Dresden Frauenkirche church, baroque architecture, dramatic sky, historic cityscape'),
  ('foto_saxony_christmas_market', 'Striezelmarkt', 'Striezelmarkt', 'Ältester Weihnachtsmarkt Deutschlands', 'Germany''s oldest Christmas market', 'kultur', 'region_saxony', 1, 'Photorealistic film photography of Dresden Christmas market at dusk, twinkling lights, festive stalls, cozy atmosphere'),
  ('foto_saxony_stollen', 'Dresdner Stollen', 'Dresden Stollen', 'Traditionelles Weihnachtsgebäck', 'Traditional Christmas pastry', 'essen_trinken', 'region_saxony', 1, 'Photorealistic food photography of Dresden Stollen Christmas bread, dusted with powdered sugar, sliced to show interior, festive setting'),
  ('foto_saxony_bastei', 'Basteibrücke', 'Bastei Bridge', 'Felsenformation in der Sächsischen Schweiz', 'Rock formation in Saxon Switzerland', 'orte', 'region_saxony', 2, 'Photorealistic landscape photography of Bastei Bridge rock formation, dramatic sandstone cliffs, forest valley below, golden hour');
