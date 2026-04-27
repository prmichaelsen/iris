-- Seed Data: Quests
-- Created: 2026-04-27
-- Description: Core quest definitions with badge progression

-- ============================================
-- CORE SKILL QUESTS (Badge Progression)
-- ============================================

INSERT INTO quests (id, name_de, name_en, description_de, description_en, category, badge_skill, tier_thresholds, points_reward, is_repeatable, is_hidden) VALUES
  ('quest_der_meister', 'Der Meister', 'The Master', 'Vervollständige Karteikarten-Übungen', 'Complete flashcard exercises', 'skill', 'flashcards', '[10, 50, 100, 500, 1000]', 100, 1, 0),
  ('quest_lauscher', 'Lauscher', 'The Listener', 'Vervollständige Diktatübungen', 'Complete dictation exercises', 'skill', 'dictation', '[5, 25, 50, 100, 250]', 100, 1, 0),
  ('quest_grammatik_ass', 'Grammatik-Ass', 'Grammar Ace', 'Vervollständige Lückentext-Übungen', 'Complete fill-in-the-blank exercises', 'skill', 'grammar', '[10, 50, 100, 250, 500]', 100, 1, 0),
  ('quest_geschlechts_kenner', 'Geschlechts-Kenner', 'Gender Expert', 'Vervollständige Artikel-Quiz', 'Complete gender quizzes', 'skill', 'gender', '[25, 100, 250, 500, 1000]', 100, 1, 0),
  ('quest_konjugator', 'Konjugator', 'Conjugator', 'Vervollständige Konjugationsübungen', 'Complete conjugation drills', 'skill', 'conjugation', '[10, 50, 100, 250, 500]', 100, 1, 0),
  ('quest_pluralprofi', 'Pluralprofi', 'Plural Pro', 'Meistere Pluralisierung', 'Master pluralization', 'skill', 'plural', '[20, 75, 150, 300, 600]', 100, 1, 0),
  ('quest_artikelakrobat', 'Artikelakrobat', 'Article Acrobat', 'Vervollständige Artikel-im-Kontext-Übungen', 'Complete article-in-context drills', 'skill', 'articles', '[25, 100, 250, 500, 1000]', 100, 1, 0);

-- ============================================
-- ACHIEVEMENT QUESTS (One-Time)
-- ============================================

INSERT INTO quests (id, name_de, name_en, description_de, description_en, category, badge_skill, tier_thresholds, points_reward, is_repeatable, is_hidden) VALUES
  ('quest_erste_schritte', 'Erste Schritte', 'First Steps', 'Vervollständige deine erste Übung', 'Complete your first exercise of any type', 'achievement', NULL, '[1]', 50, 0, 0),
  ('quest_perfektionist', 'Perfektionist', 'Perfectionist', 'Erreiche 100% in einer beliebigen 10-Karten-Übung', 'Get 100% on any 10-card drill', 'achievement', NULL, '[1]', 100, 0, 0),
  ('quest_perfekter_start', 'Perfekter Start', 'Perfect Start', 'Erreiche 100% bei einer neuen Übungsart beim ersten Versuch', 'Get 100% on a new drill type on first attempt', 'achievement', NULL, '[1]', 150, 0, 0),
  ('quest_comeback_kid', 'Comeback Kid', 'Comeback Kid', 'Beantworte ein Wort falsch, dann richtig im nächsten Versuch', 'Get a word wrong, then right on next attempt in same session', 'achievement', NULL, '[1]', 50, 0, 0),
  ('quest_marathon', 'Marathon-Läufer', 'Marathon Runner', 'Vervollständige 20 Übungen in einer Sitzung', 'Complete 20 exercises in a single session', 'achievement', NULL, '[1]', 200, 0, 0),
  ('quest_fruehaufsteher', 'Frühaufsteher', 'Early Bird', 'Vervollständige eine Sitzung vor 8 Uhr morgens', 'Complete session before 8am', 'achievement', NULL, '[1]', 75, 0, 0),
  ('quest_nachteule', 'Nachteule', 'Night Owl', 'Vervollständige eine Sitzung nach 22 Uhr', 'Complete session after 10pm', 'achievement', NULL, '[1]', 75, 0, 0),
  ('quest_wochenend_krieger', 'Wochenend-Krieger', 'Weekend Warrior', 'Vervollständige Sitzungen an Samstag und Sonntag', 'Complete sessions on both Saturday and Sunday', 'achievement', NULL, '[1]', 100, 0, 0),
  ('quest_guten_appetit', 'Guten Appetit!', 'Enjoy Your Meal!', 'Vervollständige 3 Lektionen über Essensvokabular', 'Complete 3 lessons about food vocabulary', 'achievement', NULL, '[1]', 125, 0, 0),
  ('quest_weltreisender', 'Weltreisender', 'World Traveler', 'Vervollständige alle Transport-Vokabeln', 'Complete all transportation vocabulary', 'achievement', NULL, '[1]', 125, 0, 0),
  ('quest_wort_sammler', 'Wort-Sammler', 'Word Collector', 'Begegne 500 einzigartigen deutschen Wörtern', 'Encounter 500 unique German words', 'achievement', NULL, '[500]', 250, 0, 0);

-- ============================================
-- STREAK QUESTS (Repeatable/Progressive)
-- ============================================

INSERT INTO quests (id, name_de, name_en, description_de, description_en, category, badge_skill, tier_thresholds, points_reward, is_repeatable, is_hidden) VALUES
  ('quest_bestaendig', 'Beständig', 'Consistent', 'Vervollständige mindestens 1 Übung pro Tag für mehrere Tage', 'Complete at least 1 exercise per day for multiple days', 'streak', NULL, '[3, 7, 14, 30, 100]', 100, 1, 0),
  ('quest_unaufhaltsam', 'Unaufhaltsam', 'Unstoppable', 'Vervollständige 10+ Übungen pro Tag für 7 aufeinanderfolgende Tage', 'Complete 10+ drills per day for 7 consecutive days', 'streak', NULL, '[7]', 300, 0, 0),
  ('quest_taegliche_dosis', 'Tägliche Dosis', 'Daily Dose', 'Vervollständige mindestens 1 Übung pro Tag für eine Woche', 'Complete at least 1 exercise per day for a week', 'streak', NULL, '[7]', 150, 0, 0);

-- ============================================
-- FUN/HIDDEN QUESTS
-- ============================================

INSERT INTO quests (id, name_de, name_en, description_de, description_en, category, badge_skill, tier_thresholds, points_reward, is_repeatable, is_hidden) VALUES
  ('quest_blitzschnell', 'Blitzschnell', 'Lightning Fast', 'Vervollständige 5 Karteikarten in unter 10 Sekunden insgesamt', 'Complete 5 flashcards in under 10 seconds total', 'hidden', NULL, '[1]', 100, 0, 1),
  ('quest_geschwindigkeitsdaemon', 'Geschwindigkeitsdämon', 'Speed Demon', 'Vervollständige eine Karteikarte in unter 2 Sekunden', 'Complete a flashcard in under 2 seconds', 'hidden', NULL, '[1]', 75, 0, 1),
  ('quest_scharfes_ohr', 'Scharfes Ohr', 'Sharp Ear', 'Beantworte 10 Diktatübungen hintereinander richtig', 'Get 10 dictation exercises correct in a row', 'hidden', NULL, '[1]', 150, 0, 1),
  ('quest_zungenbrecher_bronze', 'Zungenbrecher (Bronze)', 'Tongue Twister (Bronze)', 'Meistere ein 4-silbiges Wort', 'Master a 4-syllable word', 'hidden', NULL, '[1]', 50, 0, 1),
  ('quest_zungenbrecher_silber', 'Zungenbrecher (Silber)', 'Tongue Twister (Silver)', 'Meistere ein 6-silbiges Wort', 'Master a 6-syllable word', 'hidden', NULL, '[1]', 100, 0, 1),
  ('quest_zungenbrecher_gold', 'Zungenbrecher (Gold)', 'Tongue Twister (Gold)', 'Meistere ein 8-silbiges Wort', 'Master an 8-syllable word', 'hidden', NULL, '[1]', 200, 0, 1),
  ('quest_zungenbrecher_platin', 'Zungenbrecher (Platin)', 'Tongue Twister (Platinum)', 'Meistere ein 9+ silbiges Wort', 'Master a 9+ syllable word', 'hidden', NULL, '[1]', 400, 0, 1),
  ('quest_redemption_arc', 'Redemption Arc', 'Redemption Arc', 'Meistere endlich ein Wort, das du 5+ Mal falsch hattest', 'Finally master a word you had gotten wrong 5+ times', 'hidden', NULL, '[1]', 150, 0, 1),
  ('quest_favorit_gefunden', 'Favorit gefunden', 'Found Favorite', 'Benutze dasselbe Wort 10 Mal richtig im Gespräch', 'Use the same word correctly 10 times in conversation', 'hidden', NULL, '[1]', 100, 0, 1),
  ('quest_false_friend', 'False Friend', 'False Friend', 'Begegne und identifiziere einen falschen Freund korrekt', 'Encounter and correctly identify a false cognate', 'hidden', NULL, '[1]', 125, 0, 1),
  ('quest_muttersprachler', 'Muttersprachler?', 'Native Speaker?', 'Beantworte 20 aufeinanderfolgende Übungen richtig', 'Get 20 consecutive exercises correct', 'hidden', NULL, '[1]', 250, 0, 1);

-- ============================================
-- LESSON QUESTS
-- ============================================

INSERT INTO quests (id, name_de, name_en, description_de, description_en, category, badge_skill, tier_thresholds, points_reward, is_repeatable, is_hidden) VALUES
  ('quest_lektion_1', 'Lektion 1 Abgeschlossen', 'Lesson 1 Complete', 'Vervollständige Lektion 1', 'Complete Lesson 1', 'lesson', NULL, '[1]', 150, 0, 0),
  ('quest_lektion_2', 'Lektion 2 Abgeschlossen', 'Lesson 2 Complete', 'Vervollständige Lektion 2', 'Complete Lesson 2', 'lesson', NULL, '[1]', 150, 0, 0),
  ('quest_lektion_3', 'Lektion 3 Abgeschlossen', 'Lesson 3 Complete', 'Vervollständige Lektion 3', 'Complete Lesson 3', 'lesson', NULL, '[1]', 150, 0, 0),
  ('quest_a1_champion', 'A1 Champion', 'A1 Champion', 'Vervollständige alle A1-Lektionen', 'Complete all A1 lessons', 'lesson', NULL, '[1]', 500, 0, 0),
  ('quest_b1_beherrscher', 'B1 Beherrscher', 'B1 Master', 'Vervollständige alle B1-Lektionen', 'Complete all B1 lessons', 'lesson', NULL, '[1]', 1000, 0, 0),
  ('quest_lehrers_pet', 'Lehrer''s Pet', 'Teacher''s Pet', 'Vervollständige 5 Lektionen ohne Fehler', 'Complete 5 lessons without getting any wrong', 'lesson', NULL, '[1]', 300, 0, 0);

-- ============================================
-- PERSONALITY/CULTURAL QUESTS
-- ============================================

INSERT INTO quests (id, name_de, name_en, description_de, description_en, category, badge_skill, tier_thresholds, points_reward, is_repeatable, is_hidden) VALUES
  ('quest_hoeflichkeitsmeister', 'Höflichkeitsmeister', 'Politeness Master', 'Meistere formell vs. informell (Sie/du)', 'Master formal vs. informal (Sie/du)', 'cultural', NULL, '[1]', 150, 0, 0),
  ('quest_small_talk_koenig', 'Small Talk König', 'Small Talk King', 'Vervollständige 5 Gesprächspraxis-Sitzungen', 'Complete 5 conversation practice sessions', 'cultural', NULL, '[1]', 200, 0, 0),
  ('quest_komplimente_kuenstler', 'Komplimente-Künstler', 'Compliment Artist', 'Meistere Komplimente auf Deutsch', 'Master giving compliments in German', 'cultural', NULL, '[1]', 125, 0, 0),
  ('quest_beschwerdefuehrer', 'Beschwerdeführer', 'Complainer', 'Meistere Beschwerde-Vokabular', 'Master complaint vocabulary', 'cultural', NULL, '[1]', 125, 0, 0),
  ('quest_baecker_freund', 'Bäcker-Freund', 'Baker''s Friend', 'Meistere Bäckerei-Bestellung (Brötchen, Brezel, etc.)', 'Master bakery ordering (Brötchen, Brezel, etc.)', 'cultural', NULL, '[1]', 100, 0, 0),
  ('quest_puenktlich', 'Pünktlich!', 'Punctual!', 'Vervollständige Übungen zur geplanten Zeit 5 Tage hintereinander', 'Complete exercises at scheduled time 5 days in a row', 'cultural', NULL, '[1]', 150, 0, 0),
  ('quest_mila_gallery_inspiration', 'Galerie-Inspiration', 'Gallery Inspiration', 'Besuche eine Berliner Galerie und diskutiere Kunst auf Deutsch', 'Visit a Berlin gallery and discuss art in German', 'cultural', NULL, '[1]', 200, 0, 0);

-- ============================================
-- META/SYSTEM QUESTS
-- ============================================

INSERT INTO quests (id, name_de, name_en, description_de, description_en, category, badge_skill, tier_thresholds, points_reward, is_repeatable, is_hidden) VALUES
  ('quest_entdecker', 'Entdecker', 'Explorer', 'Probiere jeden Widget-Typ mindestens einmal aus', 'Try every widget type at least once', 'meta', NULL, '[1]', 100, 0, 0),
  ('quest_ziele_setzer', 'Ziele-Setzer', 'Goal Setter', 'Erstelle dein erstes individuelles Ziel', 'Create your first custom goal', 'meta', NULL, '[1]', 75, 0, 0),
  ('quest_teilen', 'Teilen ist Kümmern', 'Sharing is Caring', 'Teile deine Sticker-Seite', 'Share your sticker page', 'meta', NULL, '[1]', 100, 0, 0),
  ('quest_sammler', 'Sammler', 'Collector', 'Sammle einzigartige Sticker', 'Collect unique stickers', 'meta', NULL, '[10, 25, 50, 100]', 50, 1, 0),
  ('quest_glueckspilz', 'Glückspilz', 'Lucky Mushroom', 'Öffne 10 Loot-Boxen', 'Open 10 loot boxes', 'meta', NULL, '[10]', 100, 0, 0),
  ('quest_stimmen_wechsler', 'Stimmen-Wechsler', 'Voice Switcher', 'Schalte 3 verschiedene ElevenLabs-Stimmen frei und benutze sie', 'Unlock and use 3 different ElevenLabs voices', 'meta', NULL, '[3]', 150, 0, 0),
  ('quest_stil_ikone', 'Stil-Ikone', 'Style Icon', 'Schalte 5 Vanity-Items frei (Schriftarten, Farben, etc.)', 'Unlock 5 vanity items (fonts, colors, etc.)', 'meta', NULL, '[5]', 200, 0, 0);
