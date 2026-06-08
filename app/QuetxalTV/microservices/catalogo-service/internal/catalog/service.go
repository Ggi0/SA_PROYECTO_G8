package catalog

import (
	"encoding/json"
	"fmt"

	pb "github.com/quetxaltv/catalog-service/proto/catalog"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetCatalog(contentType string, genreID, page, pageSize int) (*pb.GetCatalogResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	rows, total, err := s.repo.GetCatalog(contentType, genreID, page, pageSize)
	if err != nil {
		return nil, fmt.Errorf("GetCatalog: %w", err)
	}

	items := make([]*pb.ContentCard, 0, len(rows))
	for _, r := range rows {
		genres, _ := parseGenreNames(r.Genres)
		items = append(items, &pb.ContentCard{
			ContentId:         r.ContentID,
			ContentType:       r.ContentType,
			Title:             r.Title,
			ReleaseYear:       int32(r.ReleaseYear),
			DurationMin:       int32(r.DurationMin),
			RatingClass:       r.RatingClass,
			PosterUrl:         r.PosterURL,
			Genres:            genres,
			RecommendationPct: r.RecommendationPct,
			AvgStars:          r.AvgStars,
			TotalVotes:        r.TotalVotes,
		})
	}

	return &pb.GetCatalogResponse{Items: items, Total: int32(total)}, nil
}

func (s *Service) GetContentDetail(contentID string) (*pb.ContentDetail, error) {
	row, err := s.repo.GetContentDetail(contentID)
	if err != nil {
		return nil, fmt.Errorf("GetContentDetail: %w", err)
	}
	if row == nil {
		return nil, nil
	}

	genres, _ := parseGenreObjects(row.GenresJSON)
	cast, _ := parseCast(row.CastJSON)

	return &pb.ContentDetail{
		ContentId:         row.ContentID,
		ContentType:       row.ContentType,
		Title:             row.Title,
		OriginalTitle:     row.OriginalTitle,
		Synopsis:          row.Synopsis,
		ReleaseYear:       int32(row.ReleaseYear),
		DurationMin:       int32(row.DurationMin),
		RatingClass:       row.RatingClass,
		PosterUrl:         row.PosterURL,
		TrailerUrl:        row.TrailerURL,
		VideoRef:          row.VideoRef,
		VideoSource:       row.VideoSource,
		Genres:            genres,
		CastAndCrew:       cast,
		RecommendationPct: row.RecommendationPct,
		AvgStars:          row.AvgStars,
	}, nil
}

func (s *Service) GetSeriesStructure(contentID string) (*pb.GetSeriesStructureResponse, error) {
	rows, err := s.repo.GetSeriesStructure(contentID)
	if err != nil {
		return nil, fmt.Errorf("GetSeriesStructure: %w", err)
	}

	// Agrupa filas en temporadas → episodios
	seasonsMap := map[string]*pb.Season{}
	seasonOrder := []string{}

	var seriesTitle string
	for _, r := range rows {
		seriesTitle = r.SeriesTitle
		if _, exists := seasonsMap[r.SeasonID]; !exists {
			seasonsMap[r.SeasonID] = &pb.Season{
				SeasonId:    r.SeasonID,
				SeasonNum:   int32(r.SeasonNum),
				Title:       r.SeasonTitle,
				ReleaseYear: 0,
			}
			seasonOrder = append(seasonOrder, r.SeasonID)
		}
		seasonsMap[r.SeasonID].Episodes = append(seasonsMap[r.SeasonID].Episodes, &pb.Episode{
			EpisodeId:   r.EpisodeID,
			EpisodeNum:  int32(r.EpisodeNum),
			Title:       r.EpisodeTitle,
			Synopsis:    r.EpisodeSynopsis,
			DurationMin: int32(r.DurationMin),
			VideoRef:    r.VideoRef,
			VideoSource: r.VideoSource,
		})
	}

	seasons := make([]*pb.Season, 0, len(seasonOrder))
	for _, sid := range seasonOrder {
		seasons = append(seasons, seasonsMap[sid])
	}

	return &pb.GetSeriesStructureResponse{
		ContentId:   contentID,
		SeriesTitle: seriesTitle,
		Seasons:     seasons,
	}, nil
}

func (s *Service) SearchContent(query, contentType string) (*pb.SearchContentResponse, error) {
	rows, err := s.repo.SearchContent(query, contentType)
	if err != nil {
		return nil, fmt.Errorf("SearchContent: %w", err)
	}

	results := make([]*pb.ContentCard, 0, len(rows))
	for _, r := range rows {
		results = append(results, &pb.ContentCard{
			ContentId:   r.ContentID,
			ContentType: r.ContentType,
			Title:       r.Title,
			ReleaseYear: int32(r.ReleaseYear),
			PosterUrl:   r.PosterURL,
		})
	}

	return &pb.SearchContentResponse{Results: results}, nil
}

func (s *Service) RateContent(contentID, profileID, thumb string, stars int) (*pb.RateContentResponse, error) {
	if err := s.repo.UpsertRating(contentID, profileID, thumb, stars); err != nil {
		return nil, fmt.Errorf("RateContent: %w", err)
	}

	recPct, avgStars, err := s.repo.GetRatingMetrics(contentID)
	if err != nil {
		return nil, err
	}

	return &pb.RateContentResponse{
		Success:           true,
		RecommendationPct: recPct,
		AvgStars:          avgStars,
	}, nil
}

func (s *Service) GetUserRating(contentID, profileID string) (*pb.UserRating, error) {
	row, err := s.repo.GetUserRating(contentID, profileID)
	if err != nil {
		return nil, fmt.Errorf("GetUserRating: %w", err)
	}
	if row == nil {
		return &pb.UserRating{ContentId: contentID, ProfileId: profileID}, nil
	}
	return &pb.UserRating{
		ContentId: row.ContentID,
		ProfileId: row.ProfileID,
		Thumb:     row.Thumb,
		Stars:     int32(row.Stars),
	}, nil
}

func (s *Service) ListGenres() (*pb.ListGenresResponse, error) {
	rows, err := s.repo.ListGenres()
	if err != nil {
		return nil, fmt.Errorf("ListGenres: %w", err)
	}

	genres := make([]*pb.Genre, 0, len(rows))
	for _, g := range rows {
		genres = append(genres, &pb.Genre{
			GenreId: int32(g.GenreID),
			Name:    g.Name,
			Slug:    g.Slug,
		})
	}
	return &pb.ListGenresResponse{Genres: genres}, nil
}

func (s *Service) CreateContent(req CreateContentInput) (*pb.ContentCard, error) {
	contentID, err := s.repo.CreateContent(req)
	if err != nil {
		return nil, fmt.Errorf("CreateContent: %w", err)
	}
	return &pb.ContentCard{
		ContentId:   contentID,
		ContentType: req.ContentType,
		Title:       req.Title,
		ReleaseYear: int32(req.ReleaseYear),
		PosterUrl:   req.PosterURL,
	}, nil
}

func (s *Service) UpdateContent(req UpdateContentInput) (*pb.ContentCard, error) {
	if err := s.repo.UpdateContent(req); err != nil {
		return nil, fmt.Errorf("UpdateContent: %w", err)
	}
	detail, err := s.repo.GetContentDetail(req.ContentID)
	if err != nil || detail == nil {
		return nil, err
	}
	return &pb.ContentCard{
		ContentId:   detail.ContentID,
		ContentType: detail.ContentType,
		Title:       detail.Title,
		ReleaseYear: int32(detail.ReleaseYear),
		PosterUrl:   detail.PosterURL,
	}, nil
}

func (s *Service) PublishContent(contentID string) (*pb.PublishContentResponse, error) {
	publishedAt, err := s.repo.PublishContent(contentID)
	if err != nil {
		return nil, fmt.Errorf("PublishContent: %w", err)
	}
	return &pb.PublishContentResponse{Success: true, PublishedAt: publishedAt}, nil
}

func (s *Service) CreatePerson(req CreatePersonInput) (*pb.PersonDetail, error) {
	row, err := s.repo.CreatePerson(req)
	if err != nil {
		return nil, fmt.Errorf("CreatePerson: %w", err)
	}
	return rowToPersonDetail(row), nil
}

func (s *Service) GetPerson(personID string) (*pb.PersonDetail, error) {
	row, err := s.repo.GetPerson(personID)
	if err != nil {
		return nil, fmt.Errorf("GetPerson: %w", err)
	}
	if row == nil {
		return nil, nil
	}
	return rowToPersonDetail(row), nil
}

func (s *Service) AddPersonToContent(contentID, personID, roleType, characterName string, billingOrder int) (*pb.AddPersonToContentResponse, error) {
	if err := s.repo.AddPersonToContent(contentID, personID, roleType, characterName, billingOrder); err != nil {
		return nil, fmt.Errorf("AddPersonToContent: %w", err)
	}
	return &pb.AddPersonToContentResponse{Success: true}, nil
}

// ---------------------------------------------------------------------------
// helpers de mapeo JSON → proto
// ---------------------------------------------------------------------------

func rowToPersonDetail(r *PersonRow) *pb.PersonDetail {
	return &pb.PersonDetail{
		PersonId:    r.PersonID,
		FullName:    r.FullName,
		BirthDate:   r.BirthDate,
		Nationality: r.Nationality,
		Bio:         r.Bio,
		PhotoUrl:    r.PhotoURL,
	}
}

// parseGenreNames interpreta el array de PostgreSQL "{Acción,Drama}" → []*pb.Genre
func parseGenreNames(raw string) ([]*pb.Genre, error) {
	if raw == "" || raw == "{}" {
		return []*pb.Genre{}, nil
	}
	// Formato PostgreSQL: {nombre1,nombre2}
	raw = raw[1 : len(raw)-1]
	if raw == "" {
		return []*pb.Genre{}, nil
	}
	names := splitCSV(raw)
	genres := make([]*pb.Genre, 0, len(names))
	for _, n := range names {
		genres = append(genres, &pb.Genre{Name: n})
	}
	return genres, nil
}

func parseGenreObjects(jsonStr string) ([]*pb.Genre, error) {
	if jsonStr == "" || jsonStr == "[]" {
		return []*pb.Genre{}, nil
	}
	var raw []struct {
		GenreID int    `json:"genre_id"`
		Name    string `json:"name"`
	}
	if err := json.Unmarshal([]byte(jsonStr), &raw); err != nil {
		return nil, err
	}
	genres := make([]*pb.Genre, 0, len(raw))
	for _, g := range raw {
		genres = append(genres, &pb.Genre{GenreId: int32(g.GenreID), Name: g.Name})
	}
	return genres, nil
}

func parseCast(jsonStr string) ([]*pb.Person, error) {
	if jsonStr == "" || jsonStr == "[]" {
		return []*pb.Person{}, nil
	}
	var raw []struct {
		PersonID      string `json:"person_id"`
		FullName      string `json:"full_name"`
		PhotoURL      string `json:"photo_url"`
		RoleType      string `json:"role_type"`
		CharacterName string `json:"character_name"`
		BillingOrder  int    `json:"billing_order"`
	}
	if err := json.Unmarshal([]byte(jsonStr), &raw); err != nil {
		return nil, err
	}
	cast := make([]*pb.Person, 0, len(raw))
	for _, p := range raw {
		cast = append(cast, &pb.Person{
			PersonId:      p.PersonID,
			FullName:      p.FullName,
			PhotoUrl:      p.PhotoURL,
			RoleType:      p.RoleType,
			CharacterName: p.CharacterName,
			BillingOrder:  int32(p.BillingOrder),
		})
	}
	return cast, nil
}

func splitCSV(s string) []string {
	var result []string
	current := ""
	for _, c := range s {
		if c == ',' {
			result = append(result, current)
			current = ""
		} else {
			current += string(c)
		}
	}
	if current != "" {
		result = append(result, current)
	}
	return result
}
