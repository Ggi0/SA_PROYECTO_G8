package catalog

import (
	"strings"
	"testing"
)

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

func newSvc(repo RepositoryInterface) *Service { return NewService(repo) }

func assertNoErr(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func assertErr(t *testing.T, err error) {
	t.Helper()
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// ---------------------------------------------------------------------------
// GetCatalog
// ---------------------------------------------------------------------------

func TestGetCatalog_Success(t *testing.T) {
	repo := &mockRepo{
		getCatalogFn: func(ct string, gid, p, ps int) ([]CatalogCardRow, int, error) {
			return []CatalogCardRow{
				{ContentID: "abc", Title: "Película", Genres: "{Acción,Drama}"},
			}, 1, nil
		},
	}
	resp, err := newSvc(repo).GetCatalog("MOVIE", 0, 1, 20)
	assertNoErr(t, err)
	if len(resp.Items) != 1 || resp.Total != 1 {
		t.Fatalf("expected 1 item, got %d", len(resp.Items))
	}
}

func TestGetCatalog_DefaultPagination(t *testing.T) {
	called := false
	repo := &mockRepo{
		getCatalogFn: func(ct string, gid, p, ps int) ([]CatalogCardRow, int, error) {
			called = true
			if p != 1 || ps != 20 {
				t.Errorf("expected page=1 pageSize=20, got page=%d pageSize=%d", p, ps)
			}
			return nil, 0, nil
		},
	}
	newSvc(repo).GetCatalog("", 0, 0, 0) // page=0 y pageSize=0 deben corregirse
	if !called {
		t.Fatal("repo.GetCatalog no fue llamado")
	}
}

func TestGetCatalog_RepoError(t *testing.T) {
	repo := &mockRepo{
		getCatalogFn: func(string, int, int, int) ([]CatalogCardRow, int, error) {
			return nil, 0, ErrMock
		},
	}
	_, err := newSvc(repo).GetCatalog("", 0, 1, 10)
	assertErr(t, err)
}

// ---------------------------------------------------------------------------
// GetContentDetail
// ---------------------------------------------------------------------------

func TestGetContentDetail_Found(t *testing.T) {
	repo := &mockRepo{
		getContentDetailFn: func(id string) (*ContentDetailRow, error) {
			return &ContentDetailRow{
				ContentID: id, Title: "Test",
				GenresJSON: `[{"genre_id":1,"name":"Acción"}]`,
				CastJSON:   `[]`,
			}, nil
		},
	}
	detail, err := newSvc(repo).GetContentDetail("id-1")
	assertNoErr(t, err)
	if detail == nil || detail.Title != "Test" {
		t.Fatal("detalle incorrecto")
	}
}

func TestGetContentDetail_NotFound(t *testing.T) {
	repo := &mockRepo{
		getContentDetailFn: func(string) (*ContentDetailRow, error) { return nil, nil },
	}
	detail, err := newSvc(repo).GetContentDetail("no-existe")
	assertNoErr(t, err)
	if detail != nil {
		t.Fatal("esperaba nil")
	}
}

func TestGetContentDetail_RepoError(t *testing.T) {
	repo := &mockRepo{
		getContentDetailFn: func(string) (*ContentDetailRow, error) { return nil, ErrMock },
	}
	_, err := newSvc(repo).GetContentDetail("id")
	assertErr(t, err)
}

// ---------------------------------------------------------------------------
// GetSeriesStructure
// ---------------------------------------------------------------------------

func TestGetSeriesStructure_Success(t *testing.T) {
	repo := &mockRepo{
		getSeriesStructureFn: func(id string) ([]SeriesStructureRow, error) {
			return []SeriesStructureRow{
				{ContentID: id, SeriesTitle: "Serie", SeasonID: "s1", SeasonNum: 1,
					EpisodeID: "e1", EpisodeNum: 1, EpisodeTitle: "Piloto"},
			}, nil
		},
	}
	resp, err := newSvc(repo).GetSeriesStructure("s-1")
	assertNoErr(t, err)
	if len(resp.Seasons) != 1 || len(resp.Seasons[0].Episodes) != 1 {
		t.Fatal("estructura incorrecta")
	}
}

func TestGetSeriesStructure_Empty(t *testing.T) {
	repo := &mockRepo{
		getSeriesStructureFn: func(string) ([]SeriesStructureRow, error) { return nil, nil },
	}
	resp, err := newSvc(repo).GetSeriesStructure("x")
	assertNoErr(t, err)
	if len(resp.Seasons) != 0 {
		t.Fatal("esperaba seasons vacío")
	}
}

// ---------------------------------------------------------------------------
// SearchContent
// ---------------------------------------------------------------------------

func TestSearchContent_Success(t *testing.T) {
	repo := &mockRepo{
		searchContentFn: func(q, ct string) ([]SearchRow, error) {
			return []SearchRow{{ContentID: "1", Title: q}}, nil
		},
	}
	resp, err := newSvc(repo).SearchContent("batman", "MOVIE")
	assertNoErr(t, err)
	if len(resp.Results) != 1 {
		t.Fatal("esperaba 1 resultado")
	}
}

func TestSearchContent_RepoError(t *testing.T) {
	repo := &mockRepo{
		searchContentFn: func(string, string) ([]SearchRow, error) { return nil, ErrMock },
	}
	_, err := newSvc(repo).SearchContent("x", "")
	assertErr(t, err)
}

// ---------------------------------------------------------------------------
// RateContent
// ---------------------------------------------------------------------------

func TestRateContent_Success(t *testing.T) {
	repo := &mockRepo{
		upsertRatingFn:     func(string, string, string, int) error { return nil },
		getRatingMetricsFn: func(string) (float64, float64, error) { return 80.0, 4.5, nil },
	}
	resp, err := newSvc(repo).RateContent("c1", "p1", "UP", 5)
	assertNoErr(t, err)
	if !resp.Success || resp.RecommendationPct != 80.0 {
		t.Fatal("respuesta incorrecta")
	}
}

func TestRateContent_UpsertError(t *testing.T) {
	repo := &mockRepo{
		upsertRatingFn: func(string, string, string, int) error { return ErrMock },
	}
	_, err := newSvc(repo).RateContent("c1", "p1", "UP", 5)
	assertErr(t, err)
}

func TestRateContent_MetricsError(t *testing.T) {
	repo := &mockRepo{
		upsertRatingFn:     func(string, string, string, int) error { return nil },
		getRatingMetricsFn: func(string) (float64, float64, error) { return 0, 0, ErrMock },
	}
	_, err := newSvc(repo).RateContent("c1", "p1", "UP", 5)
	assertErr(t, err)
}

// ---------------------------------------------------------------------------
// GetUserRating
// ---------------------------------------------------------------------------

func TestGetUserRating_Found(t *testing.T) {
	repo := &mockRepo{
		getUserRatingFn: func(cid, pid string) (*UserRatingRow, error) {
			return &UserRatingRow{ContentID: cid, ProfileID: pid, Thumb: "UP", Stars: 4}, nil
		},
	}
	r, err := newSvc(repo).GetUserRating("c1", "p1")
	assertNoErr(t, err)
	if r.Thumb != "UP" {
		t.Fatal("thumb incorrecto")
	}
}

func TestGetUserRating_NotFound(t *testing.T) {
	repo := &mockRepo{
		getUserRatingFn: func(string, string) (*UserRatingRow, error) { return nil, nil },
	}
	r, err := newSvc(repo).GetUserRating("c1", "p1")
	assertNoErr(t, err)
	if r.Thumb != "" {
		t.Fatal("esperaba rating vacío")
	}
}

// ---------------------------------------------------------------------------
// ListGenres
// ---------------------------------------------------------------------------

func TestListGenres_Success(t *testing.T) {
	repo := &mockRepo{
		listGenresFn: func() ([]GenreRow, error) {
			return []GenreRow{{GenreID: 1, Name: "Acción", Slug: "accion"}}, nil
		},
	}
	resp, err := newSvc(repo).ListGenres()
	assertNoErr(t, err)
	if len(resp.Genres) != 1 || resp.Genres[0].Name != "Acción" {
		t.Fatal("géneros incorrectos")
	}
}

func TestListGenres_RepoError(t *testing.T) {
	repo := &mockRepo{listGenresFn: func() ([]GenreRow, error) { return nil, ErrMock }}
	_, err := newSvc(repo).ListGenres()
	assertErr(t, err)
}

// ---------------------------------------------------------------------------
// CreateContent
// ---------------------------------------------------------------------------

func TestCreateContent_Success(t *testing.T) {
	repo := &mockRepo{
		createContentFn: func(req CreateContentInput) (string, error) { return "new-uuid", nil },
	}
	card, err := newSvc(repo).CreateContent(CreateContentInput{ContentType: "MOVIE", Title: "Test"})
	assertNoErr(t, err)
	if card.ContentId != "new-uuid" {
		t.Fatal("ID incorrecto")
	}
}

func TestCreateContent_RepoError(t *testing.T) {
	repo := &mockRepo{
		createContentFn: func(CreateContentInput) (string, error) { return "", ErrMock },
	}
	_, err := newSvc(repo).CreateContent(CreateContentInput{})
	assertErr(t, err)
}

// ---------------------------------------------------------------------------
// UpdateContent
// ---------------------------------------------------------------------------

func TestUpdateContent_Success(t *testing.T) {
	repo := &mockRepo{
		updateContentFn: func(UpdateContentInput) error { return nil },
		getContentDetailFn: func(string) (*ContentDetailRow, error) {
			return &ContentDetailRow{ContentID: "c1", Title: "Updated", GenresJSON: "[]", CastJSON: "[]"}, nil
		},
	}
	card, err := newSvc(repo).UpdateContent(UpdateContentInput{ContentID: "c1", Title: "Updated"})
	assertNoErr(t, err)
	if card.Title != "Updated" {
		t.Fatal("título incorrecto")
	}
}

func TestUpdateContent_RepoError(t *testing.T) {
	repo := &mockRepo{
		updateContentFn: func(UpdateContentInput) error { return ErrMock },
	}
	_, err := newSvc(repo).UpdateContent(UpdateContentInput{ContentID: "c1"})
	assertErr(t, err)
}

// ---------------------------------------------------------------------------
// PublishContent
// ---------------------------------------------------------------------------

func TestPublishContent_Success(t *testing.T) {
	repo := &mockRepo{
		publishContentFn: func(string) (string, error) { return "2026-06-13T10:00:00Z", nil },
	}
	resp, err := newSvc(repo).PublishContent("c1")
	assertNoErr(t, err)
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}

func TestPublishContent_RepoError(t *testing.T) {
	repo := &mockRepo{
		publishContentFn: func(string) (string, error) { return "", ErrMock },
	}
	_, err := newSvc(repo).PublishContent("c1")
	assertErr(t, err)
}

// ---------------------------------------------------------------------------
// DeleteContent
// ---------------------------------------------------------------------------

func TestDeleteContent_Success(t *testing.T) {
	repo := &mockRepo{
		deleteContentFn: func(string, string) error { return nil },
	}
	resp, err := newSvc(repo).DeleteContent("c1", "admin-1")
	assertNoErr(t, err)
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}

func TestDeleteContent_RepoError(t *testing.T) {
	repo := &mockRepo{
		deleteContentFn: func(string, string) error { return ErrMock },
	}
	_, err := newSvc(repo).DeleteContent("c1", "admin")
	assertErr(t, err)
}

// ---------------------------------------------------------------------------
// Genre CRUD
// ---------------------------------------------------------------------------

func TestCreateGenre_Success(t *testing.T) {
	repo := &mockRepo{
		createGenreFn: func(name, slug string) (*GenreRow, error) {
			return &GenreRow{GenreID: 10, Name: name, Slug: slug}, nil
		},
	}
	g, err := newSvc(repo).CreateGenre("Terror", "terror")
	assertNoErr(t, err)
	if g.Name != "Terror" {
		t.Fatal("nombre incorrecto")
	}
}

func TestCreateGenre_Error(t *testing.T) {
	repo := &mockRepo{createGenreFn: func(string, string) (*GenreRow, error) { return nil, ErrMock }}
	_, err := newSvc(repo).CreateGenre("X", "x")
	assertErr(t, err)
}

func TestUpdateGenre_Success(t *testing.T) {
	repo := &mockRepo{
		updateGenreFn: func(id int, name, slug string) (*GenreRow, error) {
			return &GenreRow{GenreID: id, Name: name, Slug: slug}, nil
		},
	}
	g, err := newSvc(repo).UpdateGenre(1, "Acción", "accion")
	assertNoErr(t, err)
	if g.Slug != "accion" {
		t.Fatal("slug incorrecto")
	}
}

func TestUpdateGenre_NotFound(t *testing.T) {
	repo := &mockRepo{
		updateGenreFn: func(int, string, string) (*GenreRow, error) { return nil, nil },
	}
	g, err := newSvc(repo).UpdateGenre(99, "X", "x")
	assertNoErr(t, err)
	if g != nil {
		t.Fatal("esperaba nil")
	}
}

func TestDeleteGenre_Success(t *testing.T) {
	repo := &mockRepo{deleteGenreFn: func(int, string) error { return nil }}
	resp, err := newSvc(repo).DeleteGenre(1, "admin")
	assertNoErr(t, err)
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}

func TestDeleteGenre_Error(t *testing.T) {
	repo := &mockRepo{deleteGenreFn: func(int, string) error { return ErrMock }}
	_, err := newSvc(repo).DeleteGenre(1, "admin")
	assertErr(t, err)
}

// ---------------------------------------------------------------------------
// Person CRUD
// ---------------------------------------------------------------------------

func TestCreatePerson_Success(t *testing.T) {
	repo := &mockRepo{
		createPersonFn: func(req CreatePersonInput) (*PersonRow, error) {
			return &PersonRow{PersonID: "p-1", FullName: req.FullName}, nil
		},
	}
	p, err := newSvc(repo).CreatePerson(CreatePersonInput{FullName: "Pedro Pascal"})
	assertNoErr(t, err)
	if p.FullName != "Pedro Pascal" {
		t.Fatal("nombre incorrecto")
	}
}

func TestGetPerson_Found(t *testing.T) {
	repo := &mockRepo{
		getPersonFn: func(id string) (*PersonRow, error) {
			return &PersonRow{PersonID: id, FullName: "Tom Hanks"}, nil
		},
	}
	p, err := newSvc(repo).GetPerson("p-1")
	assertNoErr(t, err)
	if p == nil || p.FullName != "Tom Hanks" {
		t.Fatal("persona incorrecta")
	}
}

func TestGetPerson_NotFound(t *testing.T) {
	repo := &mockRepo{getPersonFn: func(string) (*PersonRow, error) { return nil, nil }}
	p, err := newSvc(repo).GetPerson("no-existe")
	assertNoErr(t, err)
	if p != nil {
		t.Fatal("esperaba nil")
	}
}

func TestUpdatePerson_Success(t *testing.T) {
	repo := &mockRepo{
		updatePersonFn: func(req UpdatePersonInput) (*PersonRow, error) {
			return &PersonRow{PersonID: req.PersonID, FullName: req.FullName}, nil
		},
	}
	p, err := newSvc(repo).UpdatePerson(UpdatePersonInput{PersonID: "p-1", FullName: "Nuevo Nombre"})
	assertNoErr(t, err)
	if p.FullName != "Nuevo Nombre" {
		t.Fatal("nombre incorrecto")
	}
}

func TestDeletePerson_Success(t *testing.T) {
	repo := &mockRepo{deletePersonFn: func(string, string) error { return nil }}
	resp, err := newSvc(repo).DeletePerson("p-1", "admin")
	assertNoErr(t, err)
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}

// ---------------------------------------------------------------------------
// Cast
// ---------------------------------------------------------------------------

func TestAddPersonToContent_Success(t *testing.T) {
	repo := &mockRepo{addPersonToContentFn: func(string, string, string, string, int) error { return nil }}
	resp, err := newSvc(repo).AddPersonToContent("c1", "p1", "ACTOR", "Batman", 1)
	assertNoErr(t, err)
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}

func TestRemovePersonFromContent_Success(t *testing.T) {
	repo := &mockRepo{removePersonFromContentFn: func(string, string, string) error { return nil }}
	resp, err := newSvc(repo).RemovePersonFromContent("c1", "p1", "ACTOR")
	assertNoErr(t, err)
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}

func TestRemovePersonFromContent_Error(t *testing.T) {
	repo := &mockRepo{removePersonFromContentFn: func(string, string, string) error { return ErrMock }}
	_, err := newSvc(repo).RemovePersonFromContent("c1", "p1", "ACTOR")
	assertErr(t, err)
}

// ---------------------------------------------------------------------------
// Seasons & Episodes
// ---------------------------------------------------------------------------

func TestCreateSeason_Success(t *testing.T) {
	repo := &mockRepo{
		createSeasonFn: func(req CreateSeasonInput) (*SeasonRow, error) {
			return &SeasonRow{SeasonID: "s-1", ContentID: req.ContentID, SeasonNum: req.SeasonNum}, nil
		},
	}
	resp, err := newSvc(repo).CreateSeason(CreateSeasonInput{ContentID: "c1", SeasonNum: 1, Title: "Temporada 1"})
	assertNoErr(t, err)
	if resp.SeasonNum != 1 {
		t.Fatal("season_num incorrecto")
	}
}

func TestDeleteSeason_Success(t *testing.T) {
	repo := &mockRepo{deleteSeasonFn: func(string, string) error { return nil }}
	resp, err := newSvc(repo).DeleteSeason("s-1", "admin")
	assertNoErr(t, err)
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}

func TestCreateEpisode_Success(t *testing.T) {
	repo := &mockRepo{
		createEpisodeFn: func(req CreateEpisodeInput) (*EpisodeRow, error) {
			return &EpisodeRow{EpisodeID: "e-1", SeasonID: req.SeasonID, EpisodeNum: req.EpisodeNum, Title: req.Title}, nil
		},
	}
	ep, err := newSvc(repo).CreateEpisode(CreateEpisodeInput{SeasonID: "s1", EpisodeNum: 1, Title: "Piloto"})
	assertNoErr(t, err)
	if ep.Title != "Piloto" {
		t.Fatal("título incorrecto")
	}
}

func TestUpdateEpisode_Success(t *testing.T) {
	repo := &mockRepo{
		updateEpisodeFn: func(req UpdateEpisodeInput) (*EpisodeRow, error) {
			return &EpisodeRow{EpisodeID: req.EpisodeID, Title: req.Title}, nil
		},
	}
	ep, err := newSvc(repo).UpdateEpisode(UpdateEpisodeInput{EpisodeID: "e-1", Title: "Nuevo título"})
	assertNoErr(t, err)
	if ep.Title != "Nuevo título" {
		t.Fatal("título incorrecto")
	}
}

func TestUpdateEpisode_NotFound(t *testing.T) {
	repo := &mockRepo{updateEpisodeFn: func(UpdateEpisodeInput) (*EpisodeRow, error) { return nil, nil }}
	ep, err := newSvc(repo).UpdateEpisode(UpdateEpisodeInput{EpisodeID: "no-existe"})
	assertNoErr(t, err)
	if ep != nil {
		t.Fatal("esperaba nil")
	}
}

func TestDeleteEpisode_Success(t *testing.T) {
	repo := &mockRepo{deleteEpisodeFn: func(string, string) error { return nil }}
	resp, err := newSvc(repo).DeleteEpisode("e-1", "admin")
	assertNoErr(t, err)
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}

func TestDeleteEpisode_Error(t *testing.T) {
	repo := &mockRepo{deleteEpisodeFn: func(string, string) error { return ErrMock }}
	_, err := newSvc(repo).DeleteEpisode("e-1", "admin")
	assertErr(t, err)
}

// ---------------------------------------------------------------------------
// ScheduleContent
// ---------------------------------------------------------------------------

func TestScheduleContent_WithDate(t *testing.T) {
	repo := &mockRepo{
		scheduleContentFn: func(id, date, by string) (string, error) {
			return date, nil
		},
	}
	resp, err := newSvc(repo).ScheduleContent("c1", "2026-12-25T20:00:00Z", "admin")
	assertNoErr(t, err)
	if !resp.Success || resp.PremiereDate != "2026-12-25T20:00:00Z" {
		t.Fatal("premiere_date incorrecta")
	}
}

func TestScheduleContent_ClearDate(t *testing.T) {
	repo := &mockRepo{
		scheduleContentFn: func(id, date, by string) (string, error) { return "", nil },
	}
	resp, err := newSvc(repo).ScheduleContent("c1", "", "admin")
	assertNoErr(t, err)
	if !resp.Success || resp.PremiereDate != "" {
		t.Fatal("esperaba premiere_date vacío")
	}
}

func TestScheduleContent_Error(t *testing.T) {
	repo := &mockRepo{
		scheduleContentFn: func(string, string, string) (string, error) { return "", ErrMock },
	}
	_, err := newSvc(repo).ScheduleContent("c1", "2026-01-01Z", "admin")
	assertErr(t, err)
}

// ---------------------------------------------------------------------------
// Auditoría
// ---------------------------------------------------------------------------

func TestGetAuditLogs_Success(t *testing.T) {
	repo := &mockRepo{
		getAuditLogsFn: func(f AuditLogFilter) ([]AuditLogRow, int, error) {
			return []AuditLogRow{
				{ID: 1, TableName: "content", Operation: "INSERT", ChangedBy: "admin"},
			}, 1, nil
		},
	}
	rows, total, err := newSvc(repo).GetAuditLogs(AuditLogFilter{Page: 1, PageSize: 20})
	assertNoErr(t, err)
	if total != 1 || len(rows) != 1 {
		t.Fatal("resultado incorrecto")
	}
}

func TestGetAuditLogs_Error(t *testing.T) {
	repo := &mockRepo{
		getAuditLogsFn: func(AuditLogFilter) ([]AuditLogRow, int, error) { return nil, 0, ErrMock },
	}
	_, _, err := newSvc(repo).GetAuditLogs(AuditLogFilter{})
	assertErr(t, err)
}

func TestExportAuditCSV_Success(t *testing.T) {
	repo := &mockRepo{
		getAuditLogsFn: func(AuditLogFilter) ([]AuditLogRow, int, error) {
			return []AuditLogRow{
				{ID: 1, TableName: "content", Operation: "UPDATE",
					ChangedBy: "admin", ChangedAt: "2026-06-13T10:00:00Z",
					OldData: `{"title":"Old"}`, NewData: `{"title":"New"}`},
			}, 1, nil
		},
	}
	data, err := newSvc(repo).ExportAuditCSV(AuditLogFilter{})
	assertNoErr(t, err)
	csv := string(data)
	if !strings.Contains(csv, "content") || !strings.Contains(csv, "UPDATE") {
		t.Fatal("CSV no contiene los datos esperados")
	}
}

func TestExportAuditCSV_Empty(t *testing.T) {
	repo := &mockRepo{
		getAuditLogsFn: func(AuditLogFilter) ([]AuditLogRow, int, error) { return nil, 0, nil },
	}
	data, err := newSvc(repo).ExportAuditCSV(AuditLogFilter{})
	assertNoErr(t, err)
	if !strings.Contains(string(data), "ID") {
		t.Fatal("CSV debe tener encabezados aunque esté vacío")
	}
}

func TestExportAuditPDF_Success(t *testing.T) {
	repo := &mockRepo{
		getAuditLogsFn: func(AuditLogFilter) ([]AuditLogRow, int, error) {
			return []AuditLogRow{
				{ID: 1, TableName: "content", Operation: "INSERT", ChangedBy: "admin"},
				{ID: 2, TableName: "genres", Operation: "UPDATE", ChangedBy: "admin"},
			}, 2, nil
		},
	}
	data, err := newSvc(repo).ExportAuditPDF(AuditLogFilter{})
	assertNoErr(t, err)
	if len(data) == 0 {
		t.Fatal("PDF vacío")
	}
	// El PDF siempre empieza con "%PDF"
	if !strings.HasPrefix(string(data), "%PDF") {
		t.Fatal("no es un PDF válido")
	}
}
