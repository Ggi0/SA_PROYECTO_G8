package catalog

import "errors"

// ErrMock es el error genérico usado en tests para simular fallos del repositorio.
var ErrMock = errors.New("mock error")

// mockRepo implementa RepositoryInterface con campos funcionales opcionales.
// Si un campo es nil, el método devuelve el zero value sin error.
type mockRepo struct {
	getCatalogFn              func(string, int, int, int) ([]CatalogCardRow, int, error)
	getContentDetailFn        func(string) (*ContentDetailRow, error)
	getSeriesStructureFn      func(string) ([]SeriesStructureRow, error)
	searchContentFn           func(string, string) ([]SearchRow, error)
	upsertRatingFn            func(string, string, string, int) error
	getRatingMetricsFn        func(string) (float64, float64, error)
	getUserRatingFn           func(string, string) (*UserRatingRow, error)
	listGenresFn              func() ([]GenreRow, error)
	createContentFn           func(CreateContentInput) (string, error)
	updateContentFn           func(UpdateContentInput) error
	publishContentFn          func(string) (string, error)
	deleteContentFn           func(string, string) error
	createGenreFn             func(string, string) (*GenreRow, error)
	updateGenreFn             func(int, string, string) (*GenreRow, error)
	deleteGenreFn             func(int, string) error
	getPersonFn               func(string) (*PersonRow, error)
	createPersonFn            func(CreatePersonInput) (*PersonRow, error)
	updatePersonFn            func(UpdatePersonInput) (*PersonRow, error)
	deletePersonFn            func(string, string) error
	addPersonToContentFn      func(string, string, string, string, int) error
	removePersonFromContentFn func(string, string, string) error
	createSeasonFn            func(CreateSeasonInput) (*SeasonRow, error)
	deleteSeasonFn            func(string, string) error
	createEpisodeFn           func(CreateEpisodeInput) (*EpisodeRow, error)
	updateEpisodeFn           func(UpdateEpisodeInput) (*EpisodeRow, error)
	deleteEpisodeFn           func(string, string) error
	scheduleContentFn         func(string, string, string) (string, error)
	getAuditLogsFn            func(AuditLogFilter) ([]AuditLogRow, int, error)
	setChangedByFn            func(string) error
	listAllContentFn          func(string, int, int, int) ([]CatalogCardRow, int, error)
}

func (m *mockRepo) GetCatalog(ct string, gid, p, ps int) ([]CatalogCardRow, int, error) {
	if m.getCatalogFn != nil {
		return m.getCatalogFn(ct, gid, p, ps)
	}
	return nil, 0, nil
}
func (m *mockRepo) GetContentDetail(id string) (*ContentDetailRow, error) {
	if m.getContentDetailFn != nil {
		return m.getContentDetailFn(id)
	}
	return nil, nil
}
func (m *mockRepo) GetSeriesStructure(id string) ([]SeriesStructureRow, error) {
	if m.getSeriesStructureFn != nil {
		return m.getSeriesStructureFn(id)
	}
	return nil, nil
}
func (m *mockRepo) SearchContent(q, ct string) ([]SearchRow, error) {
	if m.searchContentFn != nil {
		return m.searchContentFn(q, ct)
	}
	return nil, nil
}
func (m *mockRepo) UpsertRating(cid, pid, thumb string, stars int) error {
	if m.upsertRatingFn != nil {
		return m.upsertRatingFn(cid, pid, thumb, stars)
	}
	return nil
}
func (m *mockRepo) GetRatingMetrics(id string) (float64, float64, error) {
	if m.getRatingMetricsFn != nil {
		return m.getRatingMetricsFn(id)
	}
	return 0, 0, nil
}
func (m *mockRepo) GetUserRating(cid, pid string) (*UserRatingRow, error) {
	if m.getUserRatingFn != nil {
		return m.getUserRatingFn(cid, pid)
	}
	return nil, nil
}
func (m *mockRepo) ListGenres() ([]GenreRow, error) {
	if m.listGenresFn != nil {
		return m.listGenresFn()
	}
	return nil, nil
}
func (m *mockRepo) CreateContent(req CreateContentInput) (string, error) {
	if m.createContentFn != nil {
		return m.createContentFn(req)
	}
	return "", nil
}
func (m *mockRepo) UpdateContent(req UpdateContentInput) error {
	if m.updateContentFn != nil {
		return m.updateContentFn(req)
	}
	return nil
}
func (m *mockRepo) PublishContent(id string) (string, error) {
	if m.publishContentFn != nil {
		return m.publishContentFn(id)
	}
	return "", nil
}
func (m *mockRepo) DeleteContent(id, by string) error {
	if m.deleteContentFn != nil {
		return m.deleteContentFn(id, by)
	}
	return nil
}
func (m *mockRepo) CreateGenre(name, slug string) (*GenreRow, error) {
	if m.createGenreFn != nil {
		return m.createGenreFn(name, slug)
	}
	return nil, nil
}
func (m *mockRepo) UpdateGenre(id int, name, slug string) (*GenreRow, error) {
	if m.updateGenreFn != nil {
		return m.updateGenreFn(id, name, slug)
	}
	return nil, nil
}
func (m *mockRepo) DeleteGenre(id int, by string) error {
	if m.deleteGenreFn != nil {
		return m.deleteGenreFn(id, by)
	}
	return nil
}
func (m *mockRepo) GetPerson(id string) (*PersonRow, error) {
	if m.getPersonFn != nil {
		return m.getPersonFn(id)
	}
	return nil, nil
}
func (m *mockRepo) CreatePerson(req CreatePersonInput) (*PersonRow, error) {
	if m.createPersonFn != nil {
		return m.createPersonFn(req)
	}
	return nil, nil
}
func (m *mockRepo) UpdatePerson(req UpdatePersonInput) (*PersonRow, error) {
	if m.updatePersonFn != nil {
		return m.updatePersonFn(req)
	}
	return nil, nil
}
func (m *mockRepo) DeletePerson(id, by string) error {
	if m.deletePersonFn != nil {
		return m.deletePersonFn(id, by)
	}
	return nil
}
func (m *mockRepo) AddPersonToContent(cid, pid, role, char string, order int) error {
	if m.addPersonToContentFn != nil {
		return m.addPersonToContentFn(cid, pid, role, char, order)
	}
	return nil
}
func (m *mockRepo) RemovePersonFromContent(cid, pid, role string) error {
	if m.removePersonFromContentFn != nil {
		return m.removePersonFromContentFn(cid, pid, role)
	}
	return nil
}
func (m *mockRepo) CreateSeason(req CreateSeasonInput) (*SeasonRow, error) {
	if m.createSeasonFn != nil {
		return m.createSeasonFn(req)
	}
	return nil, nil
}
func (m *mockRepo) DeleteSeason(id, by string) error {
	if m.deleteSeasonFn != nil {
		return m.deleteSeasonFn(id, by)
	}
	return nil
}
func (m *mockRepo) CreateEpisode(req CreateEpisodeInput) (*EpisodeRow, error) {
	if m.createEpisodeFn != nil {
		return m.createEpisodeFn(req)
	}
	return nil, nil
}
func (m *mockRepo) UpdateEpisode(req UpdateEpisodeInput) (*EpisodeRow, error) {
	if m.updateEpisodeFn != nil {
		return m.updateEpisodeFn(req)
	}
	return nil, nil
}
func (m *mockRepo) DeleteEpisode(id, by string) error {
	if m.deleteEpisodeFn != nil {
		return m.deleteEpisodeFn(id, by)
	}
	return nil
}
func (m *mockRepo) ScheduleContent(id, date, by string) (string, error) {
	if m.scheduleContentFn != nil {
		return m.scheduleContentFn(id, date, by)
	}
	return "", nil
}
func (m *mockRepo) GetAuditLogs(f AuditLogFilter) ([]AuditLogRow, int, error) {
	if m.getAuditLogsFn != nil {
		return m.getAuditLogsFn(f)
	}
	return nil, 0, nil
}
func (m *mockRepo) SetChangedBy(by string) error {
	if m.setChangedByFn != nil {
		return m.setChangedByFn(by)
	}
	return nil
}
func (m *mockRepo) ListAllContent(ct string, gid, p, ps int) ([]CatalogCardRow, int, error) {
	if m.listAllContentFn != nil {
		return m.listAllContentFn(ct, gid, p, ps)
	}
	return nil, 0, nil
}
