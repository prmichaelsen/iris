-- Seed Data: Characters
-- Created: 2026-04-27
-- Description: Character definitions with grading weights and specialties

INSERT INTO characters (id, name, age, region_id, personality_description, specialty, unlock_requirements, grading_weights) VALUES
  (
    'char_mila',
    'Mila',
    27,
    'region_berlin',
    'Creative, slightly chaotic, passionate about street art and underground culture',
    'Creative/Artistic Expression',
    '{"tier": 2, "subquest": "mila_gallery_inspiration"}',
    '{"vocabulary": 0.25, "cultural_awareness": 0.15, "grammar": 0.20, "comprehension": 0.15, "fluency": 0.15, "confidence": 0.10}'
  ),
  (
    'char_thomas',
    'Thomas',
    35,
    'region_bavaria',
    'Down-to-earth, traditional but open-minded, loves nature and beer',
    'Directional/Spatial Language',
    '{"tier": 2, "subquest": "thomas_alpine_hike"}',
    '{"vocabulary": 0.20, "comprehension": 0.25, "fluency": 0.20, "grammar": 0.15, "confidence": 0.10, "cultural_awareness": 0.10}'
  ),
  (
    'char_lena',
    'Lena',
    29,
    'region_hamburg',
    'Tough exterior, warm heart, loves electronic music and maritime history',
    'Slang & Casual Speech',
    '{"tier": 2, "subquest": "lena_vinyl_hunt"}',
    '{"confidence": 0.20, "cultural_awareness": 0.15, "fluency": 0.20, "vocabulary": 0.15, "comprehension": 0.15, "grammar": 0.15}'
  ),
  (
    'char_klaus',
    'Klaus',
    52,
    'region_rhine_valley',
    'Philosophical, patient, storyteller, deeply connected to tradition and land',
    'Descriptive/Sensory Language',
    '{"tier": 2, "subquest": "klaus_vineyard_tour"}',
    '{"vocabulary": 0.25, "cultural_awareness": 0.20, "grammar": 0.15, "comprehension": 0.15, "fluency": 0.15, "confidence": 0.10}'
  ),
  (
    'char_greta',
    'Greta',
    31,
    'region_black_forest',
    'Folklorist and storyteller, keeper of old tales and traditions',
    'Narrative/Storytelling',
    '{"tier": 2, "subquest": "greta_forest_tales"}',
    '{"vocabulary": 0.20, "comprehension": 0.25, "grammar": 0.20, "cultural_awareness": 0.15, "fluency": 0.10, "confidence": 0.10}'
  ),
  (
    'char_karl',
    'Karl',
    44,
    'region_saxony',
    'Historian and former East German, reflective about reunification history',
    'Historical/Political Vocabulary',
    '{"tier": 2, "subquest": "karl_history_walk"}',
    '{"vocabulary": 0.25, "cultural_awareness": 0.20, "comprehension": 0.20, "grammar": 0.15, "fluency": 0.10, "confidence": 0.10}'
  ),
  (
    'char_anna',
    'Anna',
    26,
    'region_austria',
    'Viennese café owner, passionate about coffee culture and classical music',
    'Formal Politeness & Café Culture',
    '{"tier": 3, "regions_required": 4}',
    '{"cultural_awareness": 0.25, "vocabulary": 0.20, "grammar": 0.20, "comprehension": 0.15, "fluency": 0.10, "confidence": 0.10}'
  ),
  (
    'char_lukas',
    'Lukas',
    33,
    'region_switzerland',
    'Multilingual Swiss guide, comfortable switching between languages',
    'Multilingual Context Switching',
    '{"tier": 3, "regions_required": 4}',
    '{"comprehension": 0.25, "vocabulary": 0.20, "fluency": 0.20, "grammar": 0.15, "cultural_awareness": 0.10, "confidence": 0.10}'
  );
