-- Seed Data: Pen Pals
-- Created: 2026-04-27
-- Description: Pen pal profiles with bio and recommendations

INSERT INTO pen_pals (id, character_id, region_id, bio_de, bio_en, topics, recommendations) VALUES
  (
    'penpal_mila',
    'char_mila',
    'region_berlin',
    'Berliner Künstlerin, 27 Jahre alt. Leidenschaftlich für Straßenkunst und Underground-Kultur. Leicht chaotisch, aber unglaublich kreativ.',
    'Berlin artist, 27 years old. Passionate about street art and underground culture. Slightly chaotic but incredibly creative.',
    '["art", "street_art", "politics", "gentrification", "techno", "gallery_openings"]',
    '{"music": ["Âme", "Modeselektor", "Paul Kalkbrenner"], "films": ["Lola rennt", "Good Bye Lenin!", "Victoria"], "books": ["Faserland", "Herr Lehmann", "Berlin Alexanderplatz"]}'
  ),
  (
    'penpal_thomas',
    'char_thomas',
    'region_bavaria',
    'Bergführer aus Bayern, 35 Jahre alt. Bodenständig, traditionell aber aufgeschlossen. Liebt die Natur und gutes Bier.',
    'Mountain guide from Bavaria, 35 years old. Down-to-earth, traditional but open-minded. Loves nature and good beer.',
    '["mountains", "hiking", "weather", "beer_gardens", "bavarian_traditions", "family"]',
    '{"music": ["LaBrassBanda", "Spider Murphy Gang", "Haindling"], "films": ["Wer früher stirbt ist länger tot", "Herr Bello", "Grießnockerlaffäre"], "books": ["Rita Falk novels", "Bergführer", "Alpensagen"]}'
  ),
  (
    'penpal_lena',
    'char_lena',
    'region_hamburg',
    'Hafenarbeiterin und DJ aus Hamburg, 29 Jahre alt. Harte Schale, weicher Kern. Liebt elektronische Musik und maritime Geschichte.',
    'Harbor worker and DJ from Hamburg, 29 years old. Tough exterior, warm heart. Loves electronic music and maritime history.',
    '["dj_sets", "harbor_life", "northern_pride", "rainy_weather", "vinyl_records", "nightlife"]',
    '{"music": ["Robin Schulz", "Alle Farben", "Deichkind"], "films": ["Soul Kitchen", "Absolute Giganten", "Gegen die Wand"], "books": ["Tschick", "Krabat", "Hafengeschichten"]}'
  ),
  (
    'penpal_klaus',
    'char_klaus',
    'region_rhine_valley',
    'Winzer aus dem Rheintal, 52 Jahre alt. Philosophisch, geduldig, Geschichtenerzähler. Tief mit Tradition und Land verbunden.',
    'Winemaker from Rhine Valley, 52 years old. Philosophical, patient, storyteller. Deeply connected to tradition and land.',
    '["wine", "seasons", "philosophy", "family_traditions", "river_life", "storytelling"]',
    '{"music": ["Hannes Wader", "Reinhard Mey", "Konstantin Wecker"], "films": ["Herbstmilch", "Das Boot", "Die Legende von Paul und Paula"], "books": ["Siddharta", "Der Medicus", "Rheinische Sagen"]}'
  ),
  (
    'penpal_greta',
    'char_greta',
    'region_black_forest',
    'Volkskundlerin und Geschichtenerzählerin aus dem Schwarzwald, 31 Jahre alt. Hüterin alter Geschichten und Traditionen.',
    'Folklorist and storyteller from Black Forest, 31 years old. Keeper of old tales and traditions.',
    '["folklore", "fairy_tales", "forest_life", "traditions", "nature", "mythology"]',
    '{"music": ["Die Toten Hosen", "Einstürzende Neubauten", "Siddhartha"], "films": ["Märchenperlen", "Die Nibelungen", "Der Räuber Hotzenplotz"], "books": ["Grimms Märchen", "Der Struwwelpeter", "Schwarzwaldgeschichten"]}'
  ),
  (
    'penpal_karl',
    'char_karl',
    'region_saxony',
    'Historiker aus Sachsen, 44 Jahre alt. Ehemaliger DDR-Bürger, nachdenklich über die Geschichte der Wiedervereinigung.',
    'Historian from Saxony, 44 years old. Former East German, reflective about reunification history.',
    '["history", "reunification", "east_vs_west", "politics", "museums", "memory"]',
    '{"music": ["Rammstein", "Silly", "Puhdys"], "films": ["Das Leben der Anderen", "Sonnenallee", "Barbara"], "books": ["Im Westen nichts Neues", "Stasiland", "Ostalgie"]}'
  ),
  (
    'penpal_anna',
    'char_anna',
    'region_austria',
    'Wiener Cafébesitzerin, 26 Jahre alt. Leidenschaftlich für Kaffeekultur und klassische Musik.',
    'Viennese café owner, 26 years old. Passionate about coffee culture and classical music.',
    '["coffee", "classical_music", "viennese_life", "cafes", "opera", "sachertorte"]',
    '{"music": ["Mozart", "Strauss", "Falco"], "films": ["Before Sunrise", "Amadeus", "Der Bockerer"], "books": ["Die Welt von Gestern", "Der Mann ohne Eigenschaften", "Wiener Kaffeehaus"]}'
  ),
  (
    'penpal_lukas',
    'char_lukas',
    'region_switzerland',
    'Mehrsprachiger Schweizer Führer, 33 Jahre alt. Fühlt sich wohl beim Sprachwechsel.',
    'Multilingual Swiss guide, 33 years old. Comfortable switching between languages.',
    '["languages", "mountains", "swiss_precision", "multilingualism", "hiking", "neutrality"]',
    '{"music": ["Züri West", "Patent Ochsner", "Sophie Hunger"], "films": ["Die Schweizermacher", "Vitus", "Winter Sleep"], "books": ["Heidi", "Der Besuch der alten Dame", "Schweizer Sagen"]}'
  );
