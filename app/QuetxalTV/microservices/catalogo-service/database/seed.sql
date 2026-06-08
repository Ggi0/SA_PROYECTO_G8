-- Datos de prueba para el Catálogo Service
SET search_path TO catalog;

-- Personas (actores/directores)
INSERT INTO people (person_id, full_name, birth_date, nationality, bio, photo_url) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Pedro Ramírez', '1980-05-12', 'Guatemalteco', 'Actor principal de varias producciones latinoamericanas.', 'https://placehold.co/200x200?text=PR'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'María López', '1990-03-22', 'Mexicana', 'Directora de cine reconocida en festivales internacionales.', 'https://placehold.co/200x200?text=ML'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Carlos Fuentes', '1975-11-08', 'Colombiano', 'Actor de reparto con más de 30 películas.', 'https://placehold.co/200x200?text=CF')
ON CONFLICT DO NOTHING;

-- Películas
INSERT INTO content (content_id, content_type, title, original_title, synopsis, release_year, duration_min, rating_class, poster_url, trailer_url, video_ref, video_source, is_published) VALUES
  (
    'cccccccc-0000-0000-0000-000000000001',
    'MOVIE',
    'El último quetzal',
    'The Last Quetzal',
    'Un aventurero guatemalteco descubre un tesoro maya perdido en las profundidades de la selva de Petén.',
    2023, 112, 'PG-13',
    'https://placehold.co/300x450?text=El+Ultimo+Quetzal',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'dQw4w9WgXcQ', 'youtube',
    TRUE
  ),
  (
    'cccccccc-0000-0000-0000-000000000002',
    'MOVIE',
    'Volcán de fuego',
    'Fire Volcano',
    'Basada en hechos reales. La historia de los sobrevivientes de la erupción del volcán de Fuego en 2018.',
    2024, 98, 'PG',
    'https://placehold.co/300x450?text=Volcan+de+Fuego',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'dQw4w9WgXcQ', 'youtube',
    TRUE
  )
ON CONFLICT DO NOTHING;

-- Serie
INSERT INTO content (content_id, content_type, title, synopsis, release_year, rating_class, poster_url, video_ref, video_source, is_published) VALUES
  (
    'cccccccc-0000-0000-0000-000000000003',
    'SERIES',
    'Crónicas de Xibalbá',
    'Una detective indígena investiga crímenes sobrenaturales conectados con la mitología maya en Ciudad de Guatemala.',
    2024, 'TV-MA',
    'https://placehold.co/300x450?text=Cronicas+de+Xibalba',
    NULL, 'youtube',
    TRUE
  )
ON CONFLICT DO NOTHING;

-- Temporadas y episodios de la serie
INSERT INTO seasons (season_id, content_id, season_num, title, release_year) VALUES
  ('a1a1a1a1-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 1, 'Los nueve señores', 2024)
ON CONFLICT DO NOTHING;

INSERT INTO episodes (episode_id, season_id, episode_num, title, synopsis, duration_min, video_ref, video_source) VALUES
  ('eeeeeeee-0000-0000-0000-000000000001', 'a1a1a1a1-0000-0000-0000-000000000001', 1, 'El portal', 'La detective Ixchel descubre un portal al inframundo maya.', 48, 'dQw4w9WgXcQ', 'youtube'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'a1a1a1a1-0000-0000-0000-000000000001', 2, 'Los ajaw', 'Ixchel debe enfrentarse a los señores del Xibalbá.', 52, 'dQw4w9WgXcQ', 'youtube'),
  ('eeeeeeee-0000-0000-0000-000000000003', 'a1a1a1a1-0000-0000-0000-000000000001', 3, 'La prueba del frío', 'Primera prueba en el inframundo.', 45, 'dQw4w9WgXcQ', 'youtube')
ON CONFLICT DO NOTHING;

-- Géneros a contenido
INSERT INTO content_genres (content_id, genre_id) VALUES
  ('cccccccc-0000-0000-0000-000000000001', (SELECT genre_id FROM genres WHERE slug='accion')),
  ('cccccccc-0000-0000-0000-000000000001', (SELECT genre_id FROM genres WHERE slug='drama')),
  ('cccccccc-0000-0000-0000-000000000002', (SELECT genre_id FROM genres WHERE slug='drama')),
  ('cccccccc-0000-0000-0000-000000000002', (SELECT genre_id FROM genres WHERE slug='documental')),
  ('cccccccc-0000-0000-0000-000000000003', (SELECT genre_id FROM genres WHERE slug='drama'))
ON CONFLICT DO NOTHING;

-- Reparto
INSERT INTO content_people (content_id, person_id, role_type, character_name, billing_order) VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'ACTOR', 'Marcos', 1),
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'DIRECTOR', NULL, 1),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', 'ACTOR', 'Don Ernesto', 1),
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'ACTOR', 'Ixchel', 1)
ON CONFLICT DO NOTHING;

-- Calificaciones de prueba (profile_id simulado, vienen del Auth Service)
INSERT INTO ratings (content_id, profile_id, thumb, stars) VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'UP', 5),
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'UP', 4),
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'DOWN', 2),
  ('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'UP', 5),
  ('cccccccc-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000002', 'UP', 4)
ON CONFLICT DO NOTHING;
