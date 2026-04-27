-- Seed Data: Regions
-- Created: 2026-04-27
-- Description: Regional progression map with unlocks

INSERT INTO regions (id, name_de, name_en, order_index, description_de, description_en, voice_unlock, point_cost, is_bonus, unlock_requirements) VALUES
  (
    'region_berlin',
    'Berlin',
    'Berlin',
    1,
    'Du bist gerade in Berlin angekommen. Die Stadt ist überwältigend, schnelllebig, voller Geschichte und Subkulturen.',
    'You''ve just arrived in Berlin. The city is overwhelming, fast-paced, full of history and subcultures.',
    'berliner_accent',
    600,
    0,
    NULL
  ),
  (
    'region_bavaria',
    'Bayern',
    'Bavaria',
    2,
    'Auf nach Süden nach Bayern. Alpine Dörfer, Biergärten, überraschend technikaffine Einheimische.',
    'Heading south to Bavaria. Alpine villages, beer gardens, surprisingly tech-savvy locals.',
    'bavarian_accent',
    800,
    0,
    '{"regions_completed": ["region_berlin"]}'
  ),
  (
    'region_hamburg',
    'Hamburg',
    'Hamburg',
    3,
    'Nordküste. Maritimes Flair, Fischmärkte, regnerisches Wetter, berühmtes Reeperbahn-Nachtleben.',
    'Northern coast. Maritime culture, fish markets, rainy weather, famous Reeperbahn nightlife.',
    'northern_german_accent',
    1200,
    0,
    '{"regions_completed": ["region_bavaria"]}'
  ),
  (
    'region_rhine_valley',
    'Rheintal',
    'Rhine Valley',
    4,
    'Weinberge, mittelalterliche Burgen, gemütliche Dörfer entlang des Rheins.',
    'Vineyards, medieval castles, cozy villages along the Rhine.',
    'rhineland_accent',
    1600,
    0,
    '{"regions_completed": ["region_hamburg"]}'
  ),
  (
    'region_black_forest',
    'Schwarzwald',
    'Black Forest',
    5,
    'Dichte Wälder, Kuckucksuhren, Kirschtorte, mystische Atmosphäre.',
    'Dense forests, cuckoo clocks, Black Forest cake, mystical atmosphere.',
    'swabian_accent',
    2400,
    0,
    '{"regions_completed": ["region_rhine_valley"]}'
  ),
  (
    'region_saxony',
    'Sachsen',
    'Saxony',
    6,
    'Ostdeutschland. Dresden, Leipzig, reiche Kulturgeschichte, besonderer Dialekt.',
    'Eastern Germany. Dresden, Leipzig, rich cultural history, distinctive dialect.',
    'saxon_accent',
    3200,
    0,
    '{"regions_completed": ["region_black_forest"]}'
  ),
  (
    'region_austria',
    'Österreich',
    'Austria',
    7,
    'Bonusregion. Wien, Salzburg, Alpen, eigener Dialekt und Kultur.',
    'Bonus region. Vienna, Salzburg, Alps, unique dialect and culture.',
    'austrian_accent',
    4000,
    1,
    '{"regions_completed_count": 4}'
  ),
  (
    'region_switzerland',
    'Schweiz',
    'Switzerland',
    8,
    'Bonusregion. Schweizerdeutsch, mehrsprachige Kultur, atemberaubende Berglandschaften.',
    'Bonus region. Swiss German, multilingual culture, breathtaking mountain scenery.',
    'swiss_german_accent',
    4000,
    1,
    '{"regions_completed_count": 4}'
  );
