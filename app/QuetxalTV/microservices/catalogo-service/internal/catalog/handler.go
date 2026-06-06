package catalog

import (
	"context"

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
