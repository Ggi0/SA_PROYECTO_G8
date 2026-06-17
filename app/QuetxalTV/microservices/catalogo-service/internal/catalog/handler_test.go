package catalog

import (
	"context"
	"testing"

	pb "github.com/quetxaltv/catalog-service/proto/catalog"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

func newHandler(repo RepositoryInterface) *Handler {
	return NewHandler(NewService(repo))
}

func assertCode(t *testing.T, err error, want codes.Code) {
	t.Helper()
	st, ok := status.FromError(err)
	if !ok {
		t.Fatalf("error no es gRPC status: %v", err)
	}
	if st.Code() != want {
		t.Fatalf("esperaba código %v, got %v: %v", want, st.Code(), st.Message())
	}
}

// ---------------------------------------------------------------------------
// GetCatalog
// ---------------------------------------------------------------------------

func TestHandler_GetCatalog_Success(t *testing.T) {
	repo := &mockRepo{
		getCatalogFn: func(string, int, int, int) ([]CatalogCardRow, int, error) {
			return []CatalogCardRow{{ContentID: "1", Title: "Película"}}, 1, nil
		},
	}
	resp, err := newHandler(repo).GetCatalog(context.Background(), &pb.GetCatalogRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Items) != 1 {
		t.Fatal("esperaba 1 item")
	}
}

func TestHandler_GetCatalog_RepoError(t *testing.T) {
	repo := &mockRepo{
		getCatalogFn: func(string, int, int, int) ([]CatalogCardRow, int, error) {
			return nil, 0, ErrMock
		},
	}
	_, err := newHandler(repo).GetCatalog(context.Background(), &pb.GetCatalogRequest{})
	assertCode(t, err, codes.Internal)
}

// ---------------------------------------------------------------------------
// GetContentDetail
// ---------------------------------------------------------------------------

func TestHandler_GetContentDetail_EmptyID(t *testing.T) {
	_, err := newHandler(&mockRepo{}).GetContentDetail(context.Background(), &pb.GetContentDetailRequest{ContentId: ""})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_GetContentDetail_NotFound(t *testing.T) {
	repo := &mockRepo{getContentDetailFn: func(string) (*ContentDetailRow, error) { return nil, nil }}
	_, err := newHandler(repo).GetContentDetail(context.Background(), &pb.GetContentDetailRequest{ContentId: "x"})
	assertCode(t, err, codes.NotFound)
}

func TestHandler_GetContentDetail_Success(t *testing.T) {
	repo := &mockRepo{
		getContentDetailFn: func(string) (*ContentDetailRow, error) {
			return &ContentDetailRow{ContentID: "c1", Title: "T", GenresJSON: "[]", CastJSON: "[]"}, nil
		},
	}
	resp, err := newHandler(repo).GetContentDetail(context.Background(), &pb.GetContentDetailRequest{ContentId: "c1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Title != "T" {
		t.Fatal("título incorrecto")
	}
}

// ---------------------------------------------------------------------------
// SearchContent
// ---------------------------------------------------------------------------

func TestHandler_SearchContent_EmptyQuery(t *testing.T) {
	_, err := newHandler(&mockRepo{}).SearchContent(context.Background(), &pb.SearchContentRequest{Query: ""})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_SearchContent_Success(t *testing.T) {
	repo := &mockRepo{
		searchContentFn: func(string, string) ([]SearchRow, error) {
			return []SearchRow{{ContentID: "1", Title: "Batman"}}, nil
		},
	}
	resp, err := newHandler(repo).SearchContent(context.Background(), &pb.SearchContentRequest{Query: "batman"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Results) != 1 {
		t.Fatal("esperaba 1 resultado")
	}
}

// ---------------------------------------------------------------------------
// RateContent
// ---------------------------------------------------------------------------

func TestHandler_RateContent_MissingFields(t *testing.T) {
	_, err := newHandler(&mockRepo{}).RateContent(context.Background(), &pb.RateContentRequest{})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_RateContent_Success(t *testing.T) {
	repo := &mockRepo{
		upsertRatingFn:     func(string, string, string, int) error { return nil },
		getRatingMetricsFn: func(string) (float64, float64, error) { return 75.0, 4.0, nil },
	}
	resp, err := newHandler(repo).RateContent(context.Background(), &pb.RateContentRequest{
		ContentId: "c1", ProfileId: "p1", Thumb: "UP",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}

// ---------------------------------------------------------------------------
// CreateContent
// ---------------------------------------------------------------------------

func TestHandler_CreateContent_MissingFields(t *testing.T) {
	_, err := newHandler(&mockRepo{}).CreateContent(context.Background(), &pb.CreateContentRequest{})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_CreateContent_Success(t *testing.T) {
	repo := &mockRepo{
		createContentFn: func(CreateContentInput) (string, error) { return "uuid-1", nil },
	}
	resp, err := newHandler(repo).CreateContent(context.Background(), &pb.CreateContentRequest{
		ContentType: "MOVIE", Title: "Matrix",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.ContentId != "uuid-1" {
		t.Fatal("ID incorrecto")
	}
}

// ---------------------------------------------------------------------------
// UpdateContent / PublishContent / DeleteContent
// ---------------------------------------------------------------------------

func TestHandler_UpdateContent_EmptyID(t *testing.T) {
	_, err := newHandler(&mockRepo{}).UpdateContent(context.Background(), &pb.UpdateContentRequest{ContentId: ""})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_PublishContent_EmptyID(t *testing.T) {
	_, err := newHandler(&mockRepo{}).PublishContent(context.Background(), &pb.PublishContentRequest{ContentId: ""})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_PublishContent_Success(t *testing.T) {
	repo := &mockRepo{publishContentFn: func(string) (string, error) { return "2026-06-13", nil }}
	resp, err := newHandler(repo).PublishContent(context.Background(), &pb.PublishContentRequest{ContentId: "c1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}

func TestHandler_DeleteContent_EmptyID(t *testing.T) {
	_, err := newHandler(&mockRepo{}).DeleteContent(context.Background(), &pb.DeleteContentRequest{ContentId: ""})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_DeleteContent_Success(t *testing.T) {
	repo := &mockRepo{deleteContentFn: func(string, string) error { return nil }}
	resp, err := newHandler(repo).DeleteContent(context.Background(), &pb.DeleteContentRequest{ContentId: "c1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}

// ---------------------------------------------------------------------------
// Genre handlers
// ---------------------------------------------------------------------------

func TestHandler_CreateGenre_MissingFields(t *testing.T) {
	_, err := newHandler(&mockRepo{}).CreateGenre(context.Background(), &pb.CreateGenreRequest{})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_CreateGenre_Success(t *testing.T) {
	repo := &mockRepo{
		createGenreFn: func(name, slug string) (*GenreRow, error) {
			return &GenreRow{GenreID: 5, Name: name, Slug: slug}, nil
		},
	}
	g, err := newHandler(repo).CreateGenre(context.Background(), &pb.CreateGenreRequest{Name: "Terror", Slug: "terror"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if g.Name != "Terror" {
		t.Fatal("nombre incorrecto")
	}
}

func TestHandler_UpdateGenre_MissingID(t *testing.T) {
	_, err := newHandler(&mockRepo{}).UpdateGenre(context.Background(), &pb.UpdateGenreRequest{GenreId: 0})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_DeleteGenre_MissingID(t *testing.T) {
	_, err := newHandler(&mockRepo{}).DeleteGenre(context.Background(), &pb.DeleteGenreRequest{GenreId: 0})
	assertCode(t, err, codes.InvalidArgument)
}

// ---------------------------------------------------------------------------
// Person handlers
// ---------------------------------------------------------------------------

func TestHandler_CreatePerson_MissingName(t *testing.T) {
	_, err := newHandler(&mockRepo{}).CreatePerson(context.Background(), &pb.CreatePersonRequest{FullName: ""})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_GetPerson_EmptyID(t *testing.T) {
	_, err := newHandler(&mockRepo{}).GetPerson(context.Background(), &pb.GetPersonRequest{PersonId: ""})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_GetPerson_NotFound(t *testing.T) {
	repo := &mockRepo{getPersonFn: func(string) (*PersonRow, error) { return nil, nil }}
	_, err := newHandler(repo).GetPerson(context.Background(), &pb.GetPersonRequest{PersonId: "no-existe"})
	assertCode(t, err, codes.NotFound)
}

func TestHandler_UpdatePerson_EmptyID(t *testing.T) {
	_, err := newHandler(&mockRepo{}).UpdatePerson(context.Background(), &pb.UpdatePersonRequest{PersonId: ""})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_DeletePerson_EmptyID(t *testing.T) {
	_, err := newHandler(&mockRepo{}).DeletePerson(context.Background(), &pb.DeletePersonRequest{PersonId: ""})
	assertCode(t, err, codes.InvalidArgument)
}

// ---------------------------------------------------------------------------
// Cast handlers
// ---------------------------------------------------------------------------

func TestHandler_AddPersonToContent_MissingFields(t *testing.T) {
	_, err := newHandler(&mockRepo{}).AddPersonToContent(context.Background(), &pb.AddPersonToContentRequest{})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_RemovePersonFromContent_MissingFields(t *testing.T) {
	_, err := newHandler(&mockRepo{}).RemovePersonFromContent(context.Background(), &pb.RemovePersonFromContentRequest{})
	assertCode(t, err, codes.InvalidArgument)
}

// ---------------------------------------------------------------------------
// ScheduleContent
// ---------------------------------------------------------------------------

func TestHandler_ScheduleContent_EmptyID(t *testing.T) {
	_, err := newHandler(&mockRepo{}).ScheduleContent(context.Background(), &pb.ScheduleContentRequest{ContentId: ""})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_ScheduleContent_Success(t *testing.T) {
	repo := &mockRepo{
		scheduleContentFn: func(string, string, string) (string, error) { return "2026-12-25T20:00:00Z", nil },
	}
	resp, err := newHandler(repo).ScheduleContent(context.Background(), &pb.ScheduleContentRequest{
		ContentId: "c1", PremiereDate: "2026-12-25T20:00:00Z",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}

// ---------------------------------------------------------------------------
// Season & Episode handlers
// ---------------------------------------------------------------------------

func TestHandler_CreateSeason_MissingFields(t *testing.T) {
	_, err := newHandler(&mockRepo{}).CreateSeason(context.Background(), &pb.CreateSeasonRequest{ContentId: "", SeasonNum: 0})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_CreateEpisode_MissingFields(t *testing.T) {
	_, err := newHandler(&mockRepo{}).CreateEpisode(context.Background(), &pb.CreateEpisodeRequest{SeasonId: "", EpisodeNum: 0, Title: ""})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_DeleteSeason_EmptyID(t *testing.T) {
	_, err := newHandler(&mockRepo{}).DeleteSeason(context.Background(), &pb.DeleteSeasonRequest{SeasonId: ""})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_UpdateEpisode_EmptyID(t *testing.T) {
	_, err := newHandler(&mockRepo{}).UpdateEpisode(context.Background(), &pb.UpdateEpisodeRequest{EpisodeId: ""})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_DeleteEpisode_EmptyID(t *testing.T) {
	_, err := newHandler(&mockRepo{}).DeleteEpisode(context.Background(), &pb.DeleteEpisodeRequest{EpisodeId: ""})
	assertCode(t, err, codes.InvalidArgument)
}

// ---------------------------------------------------------------------------
// Success paths faltantes en handler (para elevar cobertura)
// ---------------------------------------------------------------------------

func TestHandler_GetSeriesStructure_EmptyID(t *testing.T) {
	_, err := newHandler(&mockRepo{}).GetSeriesStructure(context.Background(), &pb.GetSeriesStructureRequest{ContentId: ""})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_GetSeriesStructure_Success(t *testing.T) {
	repo := &mockRepo{
		getSeriesStructureFn: func(id string) ([]SeriesStructureRow, error) {
			return []SeriesStructureRow{
				{ContentID: id, SeriesTitle: "S", SeasonID: "s1", SeasonNum: 1, EpisodeID: "e1", EpisodeNum: 1, EpisodeTitle: "E1"},
			}, nil
		},
	}
	resp, err := newHandler(repo).GetSeriesStructure(context.Background(), &pb.GetSeriesStructureRequest{ContentId: "c1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Seasons) != 1 {
		t.Fatal("esperaba 1 temporada")
	}
}

func TestHandler_ListGenres_Success(t *testing.T) {
	repo := &mockRepo{
		listGenresFn: func() ([]GenreRow, error) {
			return []GenreRow{{GenreID: 1, Name: "Drama", Slug: "drama"}}, nil
		},
	}
	resp, err := newHandler(repo).ListGenres(context.Background(), &pb.ListGenresRequest{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Genres) != 1 {
		t.Fatal("esperaba 1 género")
	}
}

func TestHandler_ListGenres_Error(t *testing.T) {
	repo := &mockRepo{listGenresFn: func() ([]GenreRow, error) { return nil, ErrMock }}
	_, err := newHandler(repo).ListGenres(context.Background(), &pb.ListGenresRequest{})
	assertCode(t, err, codes.Internal)
}

func TestHandler_GetUserRating_MissingFields(t *testing.T) {
	_, err := newHandler(&mockRepo{}).GetUserRating(context.Background(), &pb.GetUserRatingRequest{})
	assertCode(t, err, codes.InvalidArgument)
}

func TestHandler_GetUserRating_Success(t *testing.T) {
	repo := &mockRepo{
		getUserRatingFn: func(string, string) (*UserRatingRow, error) {
			return &UserRatingRow{ContentID: "c1", ProfileID: "p1", Thumb: "UP", Stars: 5}, nil
		},
	}
	resp, err := newHandler(repo).GetUserRating(context.Background(), &pb.GetUserRatingRequest{ContentId: "c1", ProfileId: "p1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Thumb != "UP" {
		t.Fatal("thumb incorrecto")
	}
}

func TestHandler_UpdateContent_Success(t *testing.T) {
	repo := &mockRepo{
		updateContentFn: func(UpdateContentInput) error { return nil },
		getContentDetailFn: func(string) (*ContentDetailRow, error) {
			return &ContentDetailRow{ContentID: "c1", Title: "Nuevo", GenresJSON: "[]", CastJSON: "[]"}, nil
		},
	}
	resp, err := newHandler(repo).UpdateContent(context.Background(), &pb.UpdateContentRequest{ContentId: "c1", Title: "Nuevo"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Title != "Nuevo" {
		t.Fatal("título incorrecto")
	}
}

func TestHandler_CreatePerson_Success(t *testing.T) {
	repo := &mockRepo{
		createPersonFn: func(req CreatePersonInput) (*PersonRow, error) {
			return &PersonRow{PersonID: "p-1", FullName: req.FullName}, nil
		},
	}
	resp, err := newHandler(repo).CreatePerson(context.Background(), &pb.CreatePersonRequest{FullName: "Tom Hanks"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.FullName != "Tom Hanks" {
		t.Fatal("nombre incorrecto")
	}
}

func TestHandler_AddPersonToContent_Success(t *testing.T) {
	repo := &mockRepo{addPersonToContentFn: func(string, string, string, string, int) error { return nil }}
	resp, err := newHandler(repo).AddPersonToContent(context.Background(), &pb.AddPersonToContentRequest{
		ContentId: "c1", PersonId: "p1", RoleType: "ACTOR",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}

func TestHandler_UpdateGenre_Success(t *testing.T) {
	repo := &mockRepo{
		updateGenreFn: func(id int, name, slug string) (*GenreRow, error) {
			return &GenreRow{GenreID: id, Name: name, Slug: slug}, nil
		},
	}
	resp, err := newHandler(repo).UpdateGenre(context.Background(), &pb.UpdateGenreRequest{GenreId: 1, Name: "Acción", Slug: "accion"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Name != "Acción" {
		t.Fatal("nombre incorrecto")
	}
}

func TestHandler_UpdateGenre_NotFound(t *testing.T) {
	repo := &mockRepo{updateGenreFn: func(int, string, string) (*GenreRow, error) { return nil, nil }}
	_, err := newHandler(repo).UpdateGenre(context.Background(), &pb.UpdateGenreRequest{GenreId: 99, Name: "X", Slug: "x"})
	assertCode(t, err, codes.NotFound)
}

func TestHandler_DeleteGenre_Success(t *testing.T) {
	repo := &mockRepo{deleteGenreFn: func(int, string) error { return nil }}
	resp, err := newHandler(repo).DeleteGenre(context.Background(), &pb.DeleteGenreRequest{GenreId: 1})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}

func TestHandler_UpdatePerson_Success(t *testing.T) {
	repo := &mockRepo{
		updatePersonFn: func(req UpdatePersonInput) (*PersonRow, error) {
			return &PersonRow{PersonID: req.PersonID, FullName: req.FullName}, nil
		},
	}
	resp, err := newHandler(repo).UpdatePerson(context.Background(), &pb.UpdatePersonRequest{PersonId: "p1", FullName: "Nuevo"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.FullName != "Nuevo" {
		t.Fatal("nombre incorrecto")
	}
}

func TestHandler_UpdatePerson_NotFound(t *testing.T) {
	repo := &mockRepo{updatePersonFn: func(UpdatePersonInput) (*PersonRow, error) { return nil, nil }}
	_, err := newHandler(repo).UpdatePerson(context.Background(), &pb.UpdatePersonRequest{PersonId: "no-existe", FullName: "X"})
	assertCode(t, err, codes.NotFound)
}

func TestHandler_DeletePerson_Success(t *testing.T) {
	repo := &mockRepo{deletePersonFn: func(string, string) error { return nil }}
	resp, err := newHandler(repo).DeletePerson(context.Background(), &pb.DeletePersonRequest{PersonId: "p1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}

func TestHandler_RemovePersonFromContent_Success(t *testing.T) {
	repo := &mockRepo{removePersonFromContentFn: func(string, string, string) error { return nil }}
	resp, err := newHandler(repo).RemovePersonFromContent(context.Background(), &pb.RemovePersonFromContentRequest{
		ContentId: "c1", PersonId: "p1", RoleType: "ACTOR",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}

func TestHandler_CreateSeason_Success(t *testing.T) {
	repo := &mockRepo{
		createSeasonFn: func(req CreateSeasonInput) (*SeasonRow, error) {
			return &SeasonRow{SeasonID: "s1", ContentID: req.ContentID, SeasonNum: req.SeasonNum}, nil
		},
	}
	resp, err := newHandler(repo).CreateSeason(context.Background(), &pb.CreateSeasonRequest{
		ContentId: "c1", SeasonNum: 1, Title: "Temporada 1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.SeasonNum != 1 {
		t.Fatal("season_num incorrecto")
	}
}

func TestHandler_DeleteSeason_Success(t *testing.T) {
	repo := &mockRepo{deleteSeasonFn: func(string, string) error { return nil }}
	resp, err := newHandler(repo).DeleteSeason(context.Background(), &pb.DeleteSeasonRequest{SeasonId: "s1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}

func TestHandler_CreateEpisode_Success(t *testing.T) {
	repo := &mockRepo{
		createEpisodeFn: func(req CreateEpisodeInput) (*EpisodeRow, error) {
			return &EpisodeRow{EpisodeID: "e1", SeasonID: req.SeasonID, EpisodeNum: req.EpisodeNum, Title: req.Title}, nil
		},
	}
	resp, err := newHandler(repo).CreateEpisode(context.Background(), &pb.CreateEpisodeRequest{
		SeasonId: "s1", EpisodeNum: 1, Title: "Piloto",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Title != "Piloto" {
		t.Fatal("título incorrecto")
	}
}

func TestHandler_UpdateEpisode_Success(t *testing.T) {
	repo := &mockRepo{
		updateEpisodeFn: func(req UpdateEpisodeInput) (*EpisodeRow, error) {
			return &EpisodeRow{EpisodeID: req.EpisodeID, Title: req.Title}, nil
		},
	}
	resp, err := newHandler(repo).UpdateEpisode(context.Background(), &pb.UpdateEpisodeRequest{EpisodeId: "e1", Title: "Nuevo"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Title != "Nuevo" {
		t.Fatal("título incorrecto")
	}
}

func TestHandler_UpdateEpisode_NotFound(t *testing.T) {
	repo := &mockRepo{updateEpisodeFn: func(UpdateEpisodeInput) (*EpisodeRow, error) { return nil, nil }}
	_, err := newHandler(repo).UpdateEpisode(context.Background(), &pb.UpdateEpisodeRequest{EpisodeId: "no-existe", Title: "X"})
	assertCode(t, err, codes.NotFound)
}

func TestHandler_DeleteEpisode_Success(t *testing.T) {
	repo := &mockRepo{deleteEpisodeFn: func(string, string) error { return nil }}
	resp, err := newHandler(repo).DeleteEpisode(context.Background(), &pb.DeleteEpisodeRequest{EpisodeId: "e1"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !resp.Success {
		t.Fatal("esperaba success=true")
	}
}
