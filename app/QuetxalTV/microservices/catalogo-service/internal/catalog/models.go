package catalog

// Filas crudas que vienen de la BD (antes de mapear a proto)

type CatalogCardRow struct {
	ContentID         string
	ContentType       string
	Title             string
	ReleaseYear       int
	DurationMin       int
	RatingClass       string
	PosterURL         string
	Genres            string // JSON array de nombres
	RecommendationPct float64
	AvgStars          float64
	TotalVotes        int64
}

type ContentDetailRow struct {
	ContentID         string
	ContentType       string
	Title             string
	OriginalTitle     string
	Synopsis          string
	ReleaseYear       int
	DurationMin       int
	RatingClass       string
	PosterURL         string
	TrailerURL        string
	VideoRef          string
	VideoSource       string
	GenresJSON        string // JSON [{genre_id, name}]
	CastJSON          string // JSON [{person_id, full_name, ...}]
	RecommendationPct float64
	AvgStars          float64
}

type SeriesStructureRow struct {
	ContentID       string
	SeriesTitle     string
	SeasonID        string
	SeasonNum       int
	SeasonTitle     string
	EpisodeID       string
	EpisodeNum      int
	EpisodeTitle    string
	EpisodeSynopsis string
	DurationMin     int
	VideoRef        string
	VideoSource     string
}

type SearchRow struct {
	ContentID   string
	ContentType string
	Title       string
	ReleaseYear int
	PosterURL   string
	Relevance   float32
}

type UserRatingRow struct {
	ContentID string
	ProfileID string
	Thumb     string
	Stars     int
}

type GenreRow struct {
	GenreID int
	Name    string
	Slug    string
}

type PersonRow struct {
	PersonID    string
	FullName    string
	BirthDate   string
	Nationality string
	Bio         string
	PhotoURL    string
}

// Inputs para operaciones de escritura

type CreateContentInput struct {
	ContentType   string
	Title         string
	OriginalTitle string
	Synopsis      string
	ReleaseYear   int
	DurationMin   int
	RatingClass   string
	PosterURL     string
	TrailerURL    string
	VideoRef      string
	VideoSource   string
	GenreIDs      []int
}

type UpdateContentInput struct {
	ContentID string
	Title     string
	Synopsis  string
	PosterURL string
	TrailerURL string
	VideoRef  string
	GenreIDs  []int
}

type CreatePersonInput struct {
	FullName    string
	BirthDate   string
	Nationality string
	Bio         string
	PhotoURL    string
}
