import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  getCatalog(
    @Query('type') type?: string,
    @Query('genre_id') genreId?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ) {
    return this.catalogService.getCatalog(
      type || '',
      Number(genreId) || 0,
      Number(page) || 1,
      Number(pageSize) || 24,
    );
  }

  @Get('search')
  searchContent(@Query('q') q: string, @Query('type') type?: string) {
    return this.catalogService.searchContent(q || '', type || '');
  }

  @Get('genres')
  listGenres() {
    return this.catalogService.listGenres();
  }

  @Get('person/:id')
  getPerson(@Param('id') id: string) {
    return this.catalogService.getPerson(id);
  }

  @Get('content/:id')
  getContentDetail(@Param('id') id: string) {
    return this.catalogService.getContentDetail(id);
  }

  @Get('series/:id/structure')
  getSeriesStructure(@Param('id') id: string) {
    return this.catalogService.getSeriesStructure(id);
  }

  @Get('content/:id/rating')
  getUserRating(@Param('id') id: string, @Query('profile_id') profileId: string) {
    return this.catalogService.getUserRating(id, profileId || '');
  }

  @Post('content/:id/rate')
  rateContent(
    @Param('id') id: string,
    @Body() body: { profileId?: string; thumb?: string; stars?: number },
  ) {
    return this.catalogService.rateContent(
      id,
      body.profileId || '',
      body.thumb || '',
      body.stars || 0,
    );
  }
}
