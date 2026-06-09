package catalog

import (
	"database/sql"
	"fmt"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{db: db}
}

// GetCatalog usa la vista v_catalog_card con filtros opcionales.
func (r *Repository) GetCatalog(contentType string, genreID, page, pageSize int) ([]CatalogCardRow, int, error) {
	where := "WHERE 1=1"
	args := []any{}
	i := 1

	if contentType != "" {
		where += fmt.Sprintf(" AND c.content_type = $%d", i)
		args = append(args, contentType)
		i++
	}

	if genreID > 0 {
		where += fmt.Sprintf(" AND EXISTS (SELECT 1 FROM content_genres cg WHERE cg.content_id = c.content_id AND cg.genre_id = $%d)", i)
		args = append(args, genreID)
		i++
	}

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM v_catalog_card c %s`, where)
	var total int
	if err := r.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	args = append(args, pageSize, offset)

	query := fmt.Sprintf(`
		SELECT content_id, content_type, title,
		       COALESCE(release_year, 0), COALESCE(duration_min, 0),
		       COALESCE(rating_class, ''), COALESCE(poster_url, ''),
		       genres::TEXT,
		       COALESCE(recommendation_pct, 0), COALESCE(avg_stars, 0), total_votes
		FROM v_catalog_card c
		%s
		ORDER BY published_at DESC
		LIMIT $%d OFFSET $%d`, where, i, i+1)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []CatalogCardRow
	for rows.Next() {
		var row CatalogCardRow
		if err := rows.Scan(
			&row.ContentID, &row.ContentType, &row.Title, &row.ReleaseYear,
			&row.DurationMin, &row.RatingClass, &row.PosterURL,
			&row.Genres, &row.RecommendationPct, &row.AvgStars, &row.TotalVotes,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, row)
	}
	return items, total, rows.Err()
}

// GetContentDetail usa la vista v_content_detail.
func (r *Repository) GetContentDetail(contentID string) (*ContentDetailRow, error) {
	query := `
		SELECT content_id, content_type, title,
		       COALESCE(original_title, ''), COALESCE(synopsis, ''),
		       COALESCE(release_year, 0), COALESCE(duration_min, 0),
		       COALESCE(rating_class, ''), COALESCE(poster_url, ''),
		       COALESCE(trailer_url, ''), COALESCE(video_ref, ''),
		       COALESCE(video_source, ''), genres::TEXT, cast_and_crew::TEXT,
		       COALESCE(recommendation_pct, 0), COALESCE(avg_stars, 0)
		FROM v_content_detail
		WHERE content_id = $1`

	row := &ContentDetailRow{}
	err := r.db.QueryRow(query, contentID).Scan(
		&row.ContentID, &row.ContentType, &row.Title, &row.OriginalTitle,
		&row.Synopsis, &row.ReleaseYear, &row.DurationMin, &row.RatingClass,
		&row.PosterURL, &row.TrailerURL, &row.VideoRef, &row.VideoSource,
		&row.GenresJSON, &row.CastJSON, &row.RecommendationPct, &row.AvgStars,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return row, err
}

// GetSeriesStructure usa la vista v_series_structure.
func (r *Repository) GetSeriesStructure(contentID string) ([]SeriesStructureRow, error) {
	query := `
		SELECT content_id, series_title, season_id, season_num,
		       COALESCE(season_title, ''), episode_id, episode_num,
		       episode_title, COALESCE(episode_synopsis, ''),
		       COALESCE(duration_min, 0), COALESCE(video_ref, ''),
		       COALESCE(video_source, '')
		FROM v_series_structure
		WHERE content_id = $1`

	rows, err := r.db.Query(query, contentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []SeriesStructureRow
	for rows.Next() {
		var row SeriesStructureRow
		if err := rows.Scan(
			&row.ContentID, &row.SeriesTitle, &row.SeasonID, &row.SeasonNum,
			&row.SeasonTitle, &row.EpisodeID, &row.EpisodeNum, &row.EpisodeTitle,
			&row.EpisodeSynopsis, &row.DurationMin, &row.VideoRef, &row.VideoSource,
		); err != nil {
			return nil, err
		}
		result = append(result, row)
	}
	return result, rows.Err()
}

// SearchContent llama a fn_search_content.
func (r *Repository) SearchContent(query, contentType string) ([]SearchRow, error) {
	var typeArg any = nil
	if contentType != "" {
		typeArg = contentType
	}

	rows, err := r.db.Query(`SELECT content_id, content_type, title, release_year, poster_url, relevance
		FROM fn_search_content($1, $2)`, query, typeArg)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SearchRow
	for rows.Next() {
		var row SearchRow
		if err := rows.Scan(&row.ContentID, &row.ContentType, &row.Title,
			&row.ReleaseYear, &row.PosterURL, &row.Relevance); err != nil {
			return nil, err
		}
		results = append(results, row)
	}
	return results, rows.Err()
}

// UpsertRating llama al stored procedure sp_upsert_rating.
func (r *Repository) UpsertRating(contentID, profileID, thumb string, stars int) error {
	var thumbArg any = nil
	if thumb != "" {
		thumbArg = thumb
	}
	var starsArg any = nil
	if stars > 0 {
		starsArg = stars
	}

	_, err := r.db.Exec(`CALL sp_upsert_rating($1, $2, $3, $4)`,
		contentID, profileID, thumbArg, starsArg)
	return err
}

// GetRatingMetrics devuelve el porcentaje y promedio de estrellas de un contenido.
func (r *Repository) GetRatingMetrics(contentID string) (recPct, avgStars float64, err error) {
	err = r.db.QueryRow(`
		SELECT COALESCE(fn_recommendation_percentage($1), 0),
		       COALESCE(fn_average_stars($1), 0)`, contentID).Scan(&recPct, &avgStars)
	return
}

// GetUserRating devuelve la calificación de un perfil para un contenido.
func (r *Repository) GetUserRating(contentID, profileID string) (*UserRatingRow, error) {
	row := &UserRatingRow{}
	err := r.db.QueryRow(`
		SELECT content_id, profile_id, COALESCE(thumb,''), COALESCE(stars,0)
		FROM ratings
		WHERE content_id = $1 AND profile_id = $2`,
		contentID, profileID,
	).Scan(&row.ContentID, &row.ProfileID, &row.Thumb, &row.Stars)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return row, err
}

// CreateContent inserta un nuevo contenido y sus géneros.
func (r *Repository) CreateContent(req CreateContentInput) (string, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	var contentID string
	err = tx.QueryRow(`
		INSERT INTO content (content_type, title, original_title, synopsis, release_year,
		                     duration_min, rating_class, poster_url, trailer_url, video_ref, video_source)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		RETURNING content_id`,
		req.ContentType, req.Title, req.OriginalTitle, req.Synopsis, req.ReleaseYear,
		req.DurationMin, req.RatingClass, req.PosterURL, req.TrailerURL, req.VideoRef, req.VideoSource,
	).Scan(&contentID)
	if err != nil {
		return "", err
	}

	for _, gID := range req.GenreIDs {
		if _, err = tx.Exec(`INSERT INTO content_genres(content_id, genre_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
			contentID, gID); err != nil {
			return "", err
		}
	}

	return contentID, tx.Commit()
}

// UpdateContent actualiza campos editables de un contenido.
func (r *Repository) UpdateContent(req UpdateContentInput) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		UPDATE content SET title=$1, synopsis=$2, poster_url=$3, trailer_url=$4, video_ref=$5
		WHERE content_id=$6`,
		req.Title, req.Synopsis, req.PosterURL, req.TrailerURL, req.VideoRef, req.ContentID)
	if err != nil {
		return err
	}

	if len(req.GenreIDs) > 0 {
		if _, err = tx.Exec(`DELETE FROM content_genres WHERE content_id=$1`, req.ContentID); err != nil {
			return err
		}
		for _, gID := range req.GenreIDs {
			if _, err = tx.Exec(`INSERT INTO content_genres(content_id, genre_id) VALUES($1,$2)`,
				req.ContentID, gID); err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

// PublishContent marca un contenido como publicado (el trigger pone published_at).
func (r *Repository) PublishContent(contentID string) (string, error) {
	var publishedAt string
	err := r.db.QueryRow(`
		UPDATE content SET is_published=TRUE WHERE content_id=$1
		RETURNING COALESCE(published_at::TEXT,'')`, contentID).Scan(&publishedAt)
	return publishedAt, err
}

// ListGenres devuelve todos los géneros.
func (r *Repository) ListGenres() ([]GenreRow, error) {
	rows, err := r.db.Query(`SELECT genre_id, name, slug FROM genres ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var genres []GenreRow
	for rows.Next() {
		var g GenreRow
		if err := rows.Scan(&g.GenreID, &g.Name, &g.Slug); err != nil {
			return nil, err
		}
		genres = append(genres, g)
	}
	return genres, rows.Err()
}

// CreatePerson inserta un actor/director/escritor.
func (r *Repository) CreatePerson(req CreatePersonInput) (*PersonRow, error) {
	row := &PersonRow{}
	err := r.db.QueryRow(`
		INSERT INTO people (full_name, birth_date, nationality, bio, photo_url)
		VALUES ($1, $2::DATE, $3, $4, $5)
		RETURNING person_id, full_name, COALESCE(birth_date::TEXT,''), COALESCE(nationality,''), COALESCE(bio,''), COALESCE(photo_url,'')`,
		req.FullName, nullableStr(req.BirthDate), nullableStr(req.Nationality),
		nullableStr(req.Bio), nullableStr(req.PhotoURL),
	).Scan(&row.PersonID, &row.FullName, &row.BirthDate, &row.Nationality, &row.Bio, &row.PhotoURL)
	return row, err
}

// GetPerson devuelve una persona por ID.
func (r *Repository) GetPerson(personID string) (*PersonRow, error) {
	row := &PersonRow{}
	err := r.db.QueryRow(`
		SELECT person_id, full_name, COALESCE(birth_date::TEXT,''), COALESCE(nationality,''),
		       COALESCE(bio,''), COALESCE(photo_url,'')
		FROM people WHERE person_id=$1`, personID,
	).Scan(&row.PersonID, &row.FullName, &row.BirthDate, &row.Nationality, &row.Bio, &row.PhotoURL)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return row, err
}

// AddPersonToContent asocia una persona a un contenido.
func (r *Repository) AddPersonToContent(contentID, personID, roleType, characterName string, billingOrder int) error {
	_, err := r.db.Exec(`
		INSERT INTO content_people(content_id, person_id, role_type, character_name, billing_order)
		VALUES($1,$2,$3,$4,$5)
		ON CONFLICT (content_id, person_id, role_type) DO UPDATE
		SET character_name=$4, billing_order=$5`,
		contentID, personID, roleType, nullableStr(characterName), nullableInt(billingOrder))
	return err
}

func nullableStr(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func nullableInt(i int) any {
	if i == 0 {
		return nil
	}
	return i
}
