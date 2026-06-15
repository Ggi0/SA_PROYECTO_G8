package catalog

import "testing"

func TestParseGenreNames(t *testing.T) {
	genres, err := parseGenreNames("{Accion,Drama}")
	if err != nil {
		t.Fatalf("parseGenreNames returned error: %v", err)
	}
	if len(genres) != 2 || genres[0].Name != "Accion" || genres[1].Name != "Drama" {
		t.Fatalf("unexpected genres: %#v", genres)
	}

	empty, err := parseGenreNames("{}")
	if err != nil || len(empty) != 0 {
		t.Fatalf("expected empty genres, got %#v err %v", empty, err)
	}
}

func TestParseGenreObjects(t *testing.T) {
	genres, err := parseGenreObjects(`[{"genre_id":1,"name":"Drama"}]`)
	if err != nil {
		t.Fatalf("parseGenreObjects returned error: %v", err)
	}
	if len(genres) != 1 || genres[0].GenreId != 1 || genres[0].Name != "Drama" {
		t.Fatalf("unexpected genres: %#v", genres)
	}
}

func TestParseCast(t *testing.T) {
	cast, err := parseCast(`[{"person_id":"p1","full_name":"Actor Uno","photo_url":"photo.jpg","role_type":"actor","character_name":"Heroe","billing_order":2}]`)
	if err != nil {
		t.Fatalf("parseCast returned error: %v", err)
	}
	if len(cast) != 1 || cast[0].PersonId != "p1" || cast[0].BillingOrder != 2 {
		t.Fatalf("unexpected cast: %#v", cast)
	}
}

func TestRowToPersonDetail(t *testing.T) {
	person := rowToPersonDetail(&PersonRow{
		PersonID:    "p1",
		FullName:    "Persona Uno",
		BirthDate:   "2000-01-01",
		Nationality: "GT",
		Bio:         "Bio",
		PhotoURL:    "photo.jpg",
	})

	if person.PersonId != "p1" || person.FullName != "Persona Uno" || person.PhotoUrl != "photo.jpg" {
		t.Fatalf("unexpected person detail: %#v", person)
	}
}

func TestSplitCSV(t *testing.T) {
	parts := splitCSV("uno,dos,tres")
	if len(parts) != 3 || parts[0] != "uno" || parts[2] != "tres" {
		t.Fatalf("unexpected split result: %#v", parts)
	}
}
