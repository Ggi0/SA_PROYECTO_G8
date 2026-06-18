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

// ScheduleContent fija o limpia la premiere_date de un contenido.
// Si premiereDate es vacío, limpia la fecha (visible inmediatamente si is_published=TRUE).
func (r *Repository) ScheduleContent(contentID, premiereDate, changedBy string) (string, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	if err = txSetChangedBy(tx, changedBy); err != nil {
		return "", err
	}

	var result string
	if premiereDate == "" {
		err = tx.QueryRow(
			`UPDATE content SET premiere_date = NULL WHERE content_id = $1
			 RETURNING COALESCE(premiere_date::TEXT, '')`,
			contentID,
		).Scan(&result)
	} else {
		err = tx.QueryRow(
			`UPDATE content SET premiere_date = $1::TIMESTAMPTZ WHERE content_id = $2
			 RETURNING premiere_date::TEXT`,
			premiereDate, contentID,
		).Scan(&result)
	}
	if err == sql.ErrNoRows {
		return "", sql.ErrNoRows
	}
	if err != nil {
		return "", err
	}
	return result, tx.Commit()
}

// DeleteContent elimina un contenido y todo lo que depende de él (cascade en BD).
func (r *Repository) DeleteContent(contentID, changedBy string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if err = txSetChangedBy(tx, changedBy); err != nil {
		return err
	}
	res, err := tx.Exec(`DELETE FROM content WHERE content_id = $1`, contentID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return tx.Commit()
}

// CreateGenre inserta un nuevo género.
func (r *Repository) CreateGenre(name, slug string) (*GenreRow, error) {
	row := &GenreRow{}
	err := r.db.QueryRow(
		`INSERT INTO genres(name, slug) VALUES($1,$2) RETURNING genre_id, name, slug`,
		name, slug,
	).Scan(&row.GenreID, &row.Name, &row.Slug)
	return row, err
}

// UpdateGenre actualiza nombre y slug de un género existente.
func (r *Repository) UpdateGenre(genreID int, name, slug string) (*GenreRow, error) {
	row := &GenreRow{}
	err := r.db.QueryRow(
		`UPDATE genres SET name=$1, slug=$2 WHERE genre_id=$3 RETURNING genre_id, name, slug`,
		name, slug, genreID,
	).Scan(&row.GenreID, &row.Name, &row.Slug)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return row, err
}

// DeleteGenre elimina un género por ID.
func (r *Repository) DeleteGenre(genreID int, changedBy string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if err = txSetChangedBy(tx, changedBy); err != nil {
		return err
	}
	res, err := tx.Exec(`DELETE FROM genres WHERE genre_id = $1`, genreID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return tx.Commit()
}

// UpdatePerson actualiza los datos de una persona.
func (r *Repository) UpdatePerson(req UpdatePersonInput) (*PersonRow, error) {
	row := &PersonRow{}
	err := r.db.QueryRow(`
		UPDATE people SET
		    full_name=$1, birth_date=$2::DATE, nationality=$3, bio=$4, photo_url=$5
		WHERE person_id=$6
		RETURNING person_id, full_name,
		          COALESCE(birth_date::TEXT,''), COALESCE(nationality,''),
		          COALESCE(bio,''), COALESCE(photo_url,'')`,
		req.FullName, nullableStr(req.BirthDate), nullableStr(req.Nationality),
		nullableStr(req.Bio), nullableStr(req.PhotoURL), req.PersonID,
	).Scan(&row.PersonID, &row.FullName, &row.BirthDate, &row.Nationality, &row.Bio, &row.PhotoURL)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return row, err
}

// DeletePerson elimina una persona por ID.
func (r *Repository) DeletePerson(personID, changedBy string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if err = txSetChangedBy(tx, changedBy); err != nil {
		return err
	}
	res, err := tx.Exec(`DELETE FROM people WHERE person_id = $1`, personID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return tx.Commit()
}

// RemovePersonFromContent elimina la relación persona-contenido.
func (r *Repository) RemovePersonFromContent(contentID, personID, roleType string) error {
	res, err := r.db.Exec(
		`DELETE FROM content_people WHERE content_id=$1 AND person_id=$2 AND role_type=$3`,
		contentID, personID, roleType,
	)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// CreateSeason inserta una nueva temporada para una serie.
func (r *Repository) CreateSeason(req CreateSeasonInput) (*SeasonRow, error) {
	row := &SeasonRow{}
	err := r.db.QueryRow(`
		INSERT INTO seasons(content_id, season_num, title, release_year)
		VALUES($1,$2,$3,$4)
		RETURNING season_id, content_id, season_num, COALESCE(title,''), COALESCE(release_year,0)`,
		req.ContentID, req.SeasonNum, nullableStr(req.Title), nullableInt(req.ReleaseYear),
	).Scan(&row.SeasonID, &row.ContentID, &row.SeasonNum, &row.Title, &row.ReleaseYear)
	return row, err
}

// DeleteSeason elimina una temporada y sus episodios (cascade).
func (r *Repository) DeleteSeason(seasonID, changedBy string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if err = txSetChangedBy(tx, changedBy); err != nil {
		return err
	}
	res, err := tx.Exec(`DELETE FROM seasons WHERE season_id=$1`, seasonID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return tx.Commit()
}

// CreateEpisode inserta un episodio en una temporada.
func (r *Repository) CreateEpisode(req CreateEpisodeInput) (*EpisodeRow, error) {
	row := &EpisodeRow{}
	err := r.db.QueryRow(`
		INSERT INTO episodes(season_id, episode_num, title, synopsis, duration_min, video_ref, video_source)
		VALUES($1,$2,$3,$4,$5,$6,$7)
		RETURNING episode_id, season_id, episode_num, title,
		          COALESCE(synopsis,''), COALESCE(duration_min,0),
		          COALESCE(video_ref,''), COALESCE(video_source,'')`,
		req.SeasonID, req.EpisodeNum, req.Title, nullableStr(req.Synopsis),
		nullableInt(req.DurationMin), nullableStr(req.VideoRef), nullableStr(req.VideoSource),
	).Scan(&row.EpisodeID, &row.SeasonID, &row.EpisodeNum, &row.Title,
		&row.Synopsis, &row.DurationMin, &row.VideoRef, &row.VideoSource)
	return row, err
}

// UpdateEpisode actualiza los datos de un episodio.
func (r *Repository) UpdateEpisode(req UpdateEpisodeInput) (*EpisodeRow, error) {
	row := &EpisodeRow{}
	err := r.db.QueryRow(`
		UPDATE episodes SET title=$1, synopsis=$2, duration_min=$3, video_ref=$4, video_source=$5
		WHERE episode_id=$6
		RETURNING episode_id, season_id, episode_num, title,
		          COALESCE(synopsis,''), COALESCE(duration_min,0),
		          COALESCE(video_ref,''), COALESCE(video_source,'')`,
		req.Title, nullableStr(req.Synopsis), nullableInt(req.DurationMin),
		nullableStr(req.VideoRef), nullableStr(req.VideoSource), req.EpisodeID,
	).Scan(&row.EpisodeID, &row.SeasonID, &row.EpisodeNum, &row.Title,
		&row.Synopsis, &row.DurationMin, &row.VideoRef, &row.VideoSource)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return row, err
}

// DeleteEpisode elimina un episodio por ID.
func (r *Repository) DeleteEpisode(episodeID, changedBy string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if err = txSetChangedBy(tx, changedBy); err != nil {
		return err
	}
	res, err := tx.Exec(`DELETE FROM episodes WHERE episode_id=$1`, episodeID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return tx.Commit()
}

// GetAuditLogs devuelve las entradas de catalog_audit_log con filtros y paginación.
func (r *Repository) GetAuditLogs(f AuditLogFilter) ([]AuditLogRow, int, error) {
	where := "WHERE 1=1"
	args := []any{}
	i := 1

	if f.TableName != "" {
		where += fmt.Sprintf(" AND table_name = $%d", i)
		args = append(args, f.TableName)
		i++
	}
	if f.Operation != "" {
		where += fmt.Sprintf(" AND operation = $%d", i)
		args = append(args, f.Operation)
		i++
	}
	if f.From != "" {
		where += fmt.Sprintf(" AND changed_at >= $%d", i)
		args = append(args, f.From)
		i++
	}
	if f.To != "" {
		where += fmt.Sprintf(" AND changed_at <= $%d", i)
		args = append(args, f.To)
		i++
	}

	var total int
	if err := r.db.QueryRow(
		fmt.Sprintf("SELECT COUNT(*) FROM catalog_audit_log %s", where), args...,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	if f.Page < 1 {
		f.Page = 1
	}
	if f.PageSize < 1 || f.PageSize > 10000 {
		f.PageSize = 20
	}
	offset := (f.Page - 1) * f.PageSize
	args = append(args, f.PageSize, offset)

	query := fmt.Sprintf(`
		SELECT id, table_name, operation, changed_by, changed_at::TEXT,
		       COALESCE(old_data::TEXT, ''), COALESCE(new_data::TEXT, '')
		FROM catalog_audit_log
		%s
		ORDER BY changed_at DESC
		LIMIT $%d OFFSET $%d`, where, i, i+1)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var result []AuditLogRow
	for rows.Next() {
		var row AuditLogRow
		if err := rows.Scan(
			&row.ID, &row.TableName, &row.Operation, &row.ChangedBy,
			&row.ChangedAt, &row.OldData, &row.NewData,
		); err != nil {
			return nil, 0, err
		}
		result = append(result, row)
	}
	return result, total, rows.Err()
}

// SetChangedBy establece el usuario responsable en la sesión de PostgreSQL.
// Usar solo cuando ya hay una conexión/tx activa; para operaciones con DML
// usar txSetChangedBy dentro de una transacción explícita.
func (r *Repository) SetChangedBy(changedBy string) error {
	if changedBy == "" {
		changedBy = "system"
	}
	_, err := r.db.Exec(`SELECT set_config('app.changed_by', $1, true)`, changedBy)
	return err
}

// txSetChangedBy setea app.changed_by dentro de una transacción activa.
// El set_config con is_local=true garantiza que el valor es visible
// para los triggers que corran en la misma transacción.
func txSetChangedBy(tx interface {
	Exec(string, ...any) (sql.Result, error)
}, changedBy string) error {
	if changedBy == "" {
		changedBy = "system"
	}
	_, err := tx.Exec(`SELECT set_config('app.changed_by', $1, true)`, changedBy)
	return err
}

// ListAllContent devuelve todo el contenido independientemente de is_published.
// Consulta la tabla content directamente (no usa v_catalog_card que filtra publicados).
func (r *Repository) ListAllContent(contentType string, genreID, page, pageSize int) ([]CatalogCardRow, int, error) {
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

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM content c %s`, where)
	var total int
	if err := r.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	args = append(args, pageSize, offset)

	query := fmt.Sprintf(`
		SELECT c.content_id, c.content_type, c.title,
		       COALESCE(c.release_year, 0), COALESCE(c.duration_min, 0),
		       COALESCE(c.rating_class, ''), COALESCE(c.poster_url, ''),
		       COALESCE(
		           ARRAY(SELECT g.name FROM content_genres cg2
		                 JOIN genres g ON cg2.genre_id = g.genre_id
		                 WHERE cg2.content_id = c.content_id ORDER BY g.name),
		           '{}'
		       )::TEXT,
		       COALESCE(fn_recommendation_percentage(c.content_id), 0),
		       COALESCE(fn_average_stars(c.content_id), 0),
		       (SELECT COUNT(*) FROM ratings r WHERE r.content_id = c.content_id)
		FROM content c
		%s
		ORDER BY c.created_at DESC
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
