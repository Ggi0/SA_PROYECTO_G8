package catalog

// RepositoryInterface abstrae el acceso a datos para permitir mocking en tests.
type RepositoryInterface interface {
	GetCatalog(contentType string, genreID, page, pageSize int) ([]CatalogCardRow, int, error)
	GetContentDetail(contentID string) (*ContentDetailRow, error)
	GetSeriesStructure(contentID string) ([]SeriesStructureRow, error)
	SearchContent(query, contentType string) ([]SearchRow, error)
	UpsertRating(contentID, profileID, thumb string, stars int) error
	GetRatingMetrics(contentID string) (recPct, avgStars float64, err error)
	GetUserRating(contentID, profileID string) (*UserRatingRow, error)
	ListGenres() ([]GenreRow, error)
	CreateContent(req CreateContentInput) (string, error)
	UpdateContent(req UpdateContentInput) error
	PublishContent(contentID string) (string, error)
	DeleteContent(contentID, changedBy string) error
	CreateGenre(name, slug string) (*GenreRow, error)
	UpdateGenre(genreID int, name, slug string) (*GenreRow, error)
	DeleteGenre(genreID int, changedBy string) error
	GetPerson(personID string) (*PersonRow, error)
	CreatePerson(req CreatePersonInput) (*PersonRow, error)
	UpdatePerson(req UpdatePersonInput) (*PersonRow, error)
	DeletePerson(personID, changedBy string) error
	AddPersonToContent(contentID, personID, roleType, characterName string, billingOrder int) error
	RemovePersonFromContent(contentID, personID, roleType string) error
	CreateSeason(req CreateSeasonInput) (*SeasonRow, error)
	DeleteSeason(seasonID, changedBy string) error
	CreateEpisode(req CreateEpisodeInput) (*EpisodeRow, error)
	UpdateEpisode(req UpdateEpisodeInput) (*EpisodeRow, error)
	DeleteEpisode(episodeID, changedBy string) error
	ScheduleContent(contentID, premiereDate, changedBy string) (string, error)
	GetAuditLogs(f AuditLogFilter) ([]AuditLogRow, int, error)
	SetChangedBy(changedBy string) error
}
