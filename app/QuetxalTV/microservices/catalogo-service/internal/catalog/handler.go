package catalog

import (
	"context"
	"mime"
	"path/filepath"

	"github.com/quetxaltv/catalog-service/internal/storage"
	pb "github.com/quetxaltv/catalog-service/proto/catalog"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Handler implementa pb.CatalogServiceServer
type Handler struct {
	pb.UnimplementedCatalogServiceServer
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) GetCatalog(ctx context.Context, req *pb.GetCatalogRequest) (*pb.GetCatalogResponse, error) {
	resp, err := h.svc.GetCatalog(req.ContentType, int(req.GenreId), int(req.Page), int(req.PageSize))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error obteniendo catálogo: %v", err)
	}
	return resp, nil
}

func (h *Handler) GetContentDetail(ctx context.Context, req *pb.GetContentDetailRequest) (*pb.ContentDetail, error) {
	if req.ContentId == "" {
		return nil, status.Error(codes.InvalidArgument, "content_id es requerido")
	}
	detail, err := h.svc.GetContentDetail(req.ContentId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error obteniendo detalle: %v", err)
	}
	if detail == nil {
		return nil, status.Error(codes.NotFound, "contenido no encontrado")
	}
	return detail, nil
}

func (h *Handler) GetSeriesStructure(ctx context.Context, req *pb.GetSeriesStructureRequest) (*pb.GetSeriesStructureResponse, error) {
	if req.ContentId == "" {
		return nil, status.Error(codes.InvalidArgument, "content_id es requerido")
	}
	resp, err := h.svc.GetSeriesStructure(req.ContentId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error obteniendo estructura de serie: %v", err)
	}
	return resp, nil
}

func (h *Handler) SearchContent(ctx context.Context, req *pb.SearchContentRequest) (*pb.SearchContentResponse, error) {
	if req.Query == "" {
		return nil, status.Error(codes.InvalidArgument, "query es requerido")
	}
	resp, err := h.svc.SearchContent(req.Query, req.ContentType)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error en búsqueda: %v", err)
	}
	return resp, nil
}

func (h *Handler) ListGenres(ctx context.Context, req *pb.ListGenresRequest) (*pb.ListGenresResponse, error) {
	resp, err := h.svc.ListGenres()
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error listando géneros: %v", err)
	}
	return resp, nil
}

func (h *Handler) GetPerson(ctx context.Context, req *pb.GetPersonRequest) (*pb.PersonDetail, error) {
	if req.PersonId == "" {
		return nil, status.Error(codes.InvalidArgument, "person_id es requerido")
	}
	person, err := h.svc.GetPerson(req.PersonId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error obteniendo persona: %v", err)
	}
	if person == nil {
		return nil, status.Error(codes.NotFound, "persona no encontrada")
	}
	return person, nil
}

func (h *Handler) RateContent(ctx context.Context, req *pb.RateContentRequest) (*pb.RateContentResponse, error) {
	if req.ContentId == "" || req.ProfileId == "" {
		return nil, status.Error(codes.InvalidArgument, "content_id y profile_id son requeridos")
	}
	resp, err := h.svc.RateContent(req.ContentId, req.ProfileId, req.Thumb, int(req.Stars))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error calificando contenido: %v", err)
	}
	return resp, nil
}

func (h *Handler) GetUserRating(ctx context.Context, req *pb.GetUserRatingRequest) (*pb.UserRating, error) {
	if req.ContentId == "" || req.ProfileId == "" {
		return nil, status.Error(codes.InvalidArgument, "content_id y profile_id son requeridos")
	}
	resp, err := h.svc.GetUserRating(req.ContentId, req.ProfileId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error obteniendo calificación: %v", err)
	}
	return resp, nil
}

func (h *Handler) GetUploadURL(ctx context.Context, req *pb.GetUploadURLRequest) (*pb.GetUploadURLResponse, error) {
	if req.Filename == "" {
		return nil, status.Error(codes.InvalidArgument, "filename es requerido")
	}
	contentType := req.ContentType
	if contentType == "" {
		contentType = mime.TypeByExtension(filepath.Ext(req.Filename))
		if contentType == "" {
			contentType = "application/octet-stream"
		}
	}
	objectName := storage.BuildObjectName(req.Filename)
	uploadURL, err := storage.NewSigner().UploadURL(ctx, objectName, contentType)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error generando URL de carga: %v", err)
	}
	return &pb.GetUploadURLResponse{UploadUrl: uploadURL, ObjectName: objectName}, nil
}

func (h *Handler) GetDownloadURL(ctx context.Context, req *pb.GetDownloadURLRequest) (*pb.GetDownloadURLResponse, error) {
	if req.ObjectName == "" {
		return nil, status.Error(codes.InvalidArgument, "object_name es requerido")
	}
	downloadURL, err := storage.NewSigner().DownloadURL(ctx, req.ObjectName)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error generando URL de descarga: %v", err)
	}
	return &pb.GetDownloadURLResponse{DownloadUrl: downloadURL, ObjectName: req.ObjectName}, nil
}

func (h *Handler) CreateContent(ctx context.Context, req *pb.CreateContentRequest) (*pb.ContentCard, error) {
	if req.ContentType == "" || req.Title == "" {
		return nil, status.Error(codes.InvalidArgument, "content_type y title son requeridos")
	}
	genreIDs := make([]int, len(req.GenreIds))
	for i, g := range req.GenreIds {
		genreIDs[i] = int(g)
	}
	card, err := h.svc.CreateContent(CreateContentInput{
		ContentType:   req.ContentType,
		Title:         req.Title,
		OriginalTitle: req.OriginalTitle,
		Synopsis:      req.Synopsis,
		ReleaseYear:   int(req.ReleaseYear),
		DurationMin:   int(req.DurationMin),
		RatingClass:   req.RatingClass,
		PosterURL:     req.PosterUrl,
		TrailerURL:    req.TrailerUrl,
		VideoRef:      req.VideoRef,
		VideoSource:   req.VideoSource,
		GenreIDs:      genreIDs,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error creando contenido: %v", err)
	}
	return card, nil
}

func (h *Handler) UpdateContent(ctx context.Context, req *pb.UpdateContentRequest) (*pb.ContentCard, error) {
	if req.ContentId == "" {
		return nil, status.Error(codes.InvalidArgument, "content_id es requerido")
	}
	genreIDs := make([]int, len(req.GenreIds))
	for i, g := range req.GenreIds {
		genreIDs[i] = int(g)
	}
	card, err := h.svc.UpdateContent(UpdateContentInput{
		ContentID:  req.ContentId,
		Title:      req.Title,
		Synopsis:   req.Synopsis,
		PosterURL:  req.PosterUrl,
		TrailerURL: req.TrailerUrl,
		VideoRef:   req.VideoRef,
		GenreIDs:   genreIDs,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error actualizando contenido: %v", err)
	}
	return card, nil
}

func (h *Handler) PublishContent(ctx context.Context, req *pb.PublishContentRequest) (*pb.PublishContentResponse, error) {
	if req.ContentId == "" {
		return nil, status.Error(codes.InvalidArgument, "content_id es requerido")
	}
	resp, err := h.svc.PublishContent(req.ContentId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error publicando contenido: %v", err)
	}
	return resp, nil
}

func (h *Handler) CreatePerson(ctx context.Context, req *pb.CreatePersonRequest) (*pb.PersonDetail, error) {
	if req.FullName == "" {
		return nil, status.Error(codes.InvalidArgument, "full_name es requerido")
	}
	person, err := h.svc.CreatePerson(CreatePersonInput{
		FullName:    req.FullName,
		BirthDate:   req.BirthDate,
		Nationality: req.Nationality,
		Bio:         req.Bio,
		PhotoURL:    req.PhotoUrl,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error creando persona: %v", err)
	}
	return person, nil
}

func (h *Handler) AddPersonToContent(ctx context.Context, req *pb.AddPersonToContentRequest) (*pb.AddPersonToContentResponse, error) {
	if req.ContentId == "" || req.PersonId == "" || req.RoleType == "" {
		return nil, status.Error(codes.InvalidArgument, "content_id, person_id y role_type son requeridos")
	}
	resp, err := h.svc.AddPersonToContent(req.ContentId, req.PersonId, req.RoleType, req.CharacterName, int(req.BillingOrder))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error asociando persona: %v", err)
	}
	return resp, nil
}

func (h *Handler) ScheduleContent(ctx context.Context, req *pb.ScheduleContentRequest) (*pb.ScheduleContentResponse, error) {
	if req.ContentId == "" {
		return nil, status.Error(codes.InvalidArgument, "content_id es requerido")
	}
	resp, err := h.svc.ScheduleContent(req.ContentId, req.PremiereDate, req.ChangedBy)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error programando estreno: %v", err)
	}
	return resp, nil
}

func (h *Handler) DeleteContent(ctx context.Context, req *pb.DeleteContentRequest) (*pb.DeleteContentResponse, error) {
	if req.ContentId == "" {
		return nil, status.Error(codes.InvalidArgument, "content_id es requerido")
	}
	resp, err := h.svc.DeleteContent(req.ContentId, req.ChangedBy)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error eliminando contenido: %v", err)
	}
	return resp, nil
}

func (h *Handler) CreateGenre(ctx context.Context, req *pb.CreateGenreRequest) (*pb.Genre, error) {
	if req.Name == "" || req.Slug == "" {
		return nil, status.Error(codes.InvalidArgument, "name y slug son requeridos")
	}
	genre, err := h.svc.CreateGenre(req.Name, req.Slug)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error creando género: %v", err)
	}
	return genre, nil
}

func (h *Handler) UpdateGenre(ctx context.Context, req *pb.UpdateGenreRequest) (*pb.Genre, error) {
	if req.GenreId == 0 {
		return nil, status.Error(codes.InvalidArgument, "genre_id es requerido")
	}
	genre, err := h.svc.UpdateGenre(int(req.GenreId), req.Name, req.Slug)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error actualizando género: %v", err)
	}
	if genre == nil {
		return nil, status.Error(codes.NotFound, "género no encontrado")
	}
	return genre, nil
}

func (h *Handler) DeleteGenre(ctx context.Context, req *pb.DeleteGenreRequest) (*pb.DeleteGenreResponse, error) {
	if req.GenreId == 0 {
		return nil, status.Error(codes.InvalidArgument, "genre_id es requerido")
	}
	resp, err := h.svc.DeleteGenre(int(req.GenreId), req.ChangedBy)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error eliminando género: %v", err)
	}
	return resp, nil
}

func (h *Handler) UpdatePerson(ctx context.Context, req *pb.UpdatePersonRequest) (*pb.PersonDetail, error) {
	if req.PersonId == "" {
		return nil, status.Error(codes.InvalidArgument, "person_id es requerido")
	}
	person, err := h.svc.UpdatePerson(UpdatePersonInput{
		PersonID:    req.PersonId,
		FullName:    req.FullName,
		BirthDate:   req.BirthDate,
		Nationality: req.Nationality,
		Bio:         req.Bio,
		PhotoURL:    req.PhotoUrl,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error actualizando persona: %v", err)
	}
	if person == nil {
		return nil, status.Error(codes.NotFound, "persona no encontrada")
	}
	return person, nil
}

func (h *Handler) DeletePerson(ctx context.Context, req *pb.DeletePersonRequest) (*pb.DeletePersonResponse, error) {
	if req.PersonId == "" {
		return nil, status.Error(codes.InvalidArgument, "person_id es requerido")
	}
	resp, err := h.svc.DeletePerson(req.PersonId, req.ChangedBy)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error eliminando persona: %v", err)
	}
	return resp, nil
}

func (h *Handler) RemovePersonFromContent(ctx context.Context, req *pb.RemovePersonFromContentRequest) (*pb.RemovePersonFromContentResponse, error) {
	if req.ContentId == "" || req.PersonId == "" || req.RoleType == "" {
		return nil, status.Error(codes.InvalidArgument, "content_id, person_id y role_type son requeridos")
	}
	resp, err := h.svc.RemovePersonFromContent(req.ContentId, req.PersonId, req.RoleType)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error eliminando persona del contenido: %v", err)
	}
	return resp, nil
}

func (h *Handler) CreateSeason(ctx context.Context, req *pb.CreateSeasonRequest) (*pb.SeasonInfo, error) {
	if req.ContentId == "" || req.SeasonNum == 0 {
		return nil, status.Error(codes.InvalidArgument, "content_id y season_num son requeridos")
	}
	resp, err := h.svc.CreateSeason(CreateSeasonInput{
		ContentID:   req.ContentId,
		SeasonNum:   int(req.SeasonNum),
		Title:       req.Title,
		ReleaseYear: int(req.ReleaseYear),
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error creando temporada: %v", err)
	}
	return resp, nil
}

func (h *Handler) DeleteSeason(ctx context.Context, req *pb.DeleteSeasonRequest) (*pb.DeleteSeasonResponse, error) {
	if req.SeasonId == "" {
		return nil, status.Error(codes.InvalidArgument, "season_id es requerido")
	}
	resp, err := h.svc.DeleteSeason(req.SeasonId, req.ChangedBy)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error eliminando temporada: %v", err)
	}
	return resp, nil
}

func (h *Handler) CreateEpisode(ctx context.Context, req *pb.CreateEpisodeRequest) (*pb.Episode, error) {
	if req.SeasonId == "" || req.EpisodeNum == 0 || req.Title == "" {
		return nil, status.Error(codes.InvalidArgument, "season_id, episode_num y title son requeridos")
	}
	resp, err := h.svc.CreateEpisode(CreateEpisodeInput{
		SeasonID:    req.SeasonId,
		EpisodeNum:  int(req.EpisodeNum),
		Title:       req.Title,
		Synopsis:    req.Synopsis,
		DurationMin: int(req.DurationMin),
		VideoRef:    req.VideoRef,
		VideoSource: req.VideoSource,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error creando episodio: %v", err)
	}
	return resp, nil
}

func (h *Handler) UpdateEpisode(ctx context.Context, req *pb.UpdateEpisodeRequest) (*pb.Episode, error) {
	if req.EpisodeId == "" {
		return nil, status.Error(codes.InvalidArgument, "episode_id es requerido")
	}
	resp, err := h.svc.UpdateEpisode(UpdateEpisodeInput{
		EpisodeID:   req.EpisodeId,
		Title:       req.Title,
		Synopsis:    req.Synopsis,
		DurationMin: int(req.DurationMin),
		VideoRef:    req.VideoRef,
		VideoSource: req.VideoSource,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error actualizando episodio: %v", err)
	}
	if resp == nil {
		return nil, status.Error(codes.NotFound, "episodio no encontrado")
	}
	return resp, nil
}

func (h *Handler) DeleteEpisode(ctx context.Context, req *pb.DeleteEpisodeRequest) (*pb.DeleteEpisodeResponse, error) {
	if req.EpisodeId == "" {
		return nil, status.Error(codes.InvalidArgument, "episode_id es requerido")
	}
	resp, err := h.svc.DeleteEpisode(req.EpisodeId, req.ChangedBy)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error eliminando episodio: %v", err)
	}
	return resp, nil
}

func (h *Handler) ListAllContent(ctx context.Context, req *pb.GetCatalogRequest) (*pb.GetCatalogResponse, error) {
	resp, err := h.svc.ListAllContent(req.ContentType, int(req.GenreId), int(req.Page), int(req.PageSize))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error listando todo el contenido: %v", err)
	}
	return resp, nil
}
