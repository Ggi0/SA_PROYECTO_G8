import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // ===== Público =====

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

  // ===== Admin — contenido =====

  @Post('admin/content')
  createContent(@Body() body: Record<string, unknown>) {
    return this.catalogService.createContent(body);
  }

  @Put('admin/content/:id')
  updateContent(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.catalogService.updateContent({ ...body, contentId: id });
  }

  @Post('admin/content/:id/publish')
  publishContent(@Param('id') id: string) {
    return this.catalogService.publishContent(id);
  }

  @Delete('admin/content/:id')
  deleteContent(
    @Param('id') id: string,
    @Body() body: { changedBy?: string },
  ) {
    return this.catalogService.deleteContent(id, body.changedBy || 'admin');
  }

  @Post('admin/content/:id/schedule')
  scheduleContent(
    @Param('id') id: string,
    @Body() body: { premiereDate?: string; changedBy?: string },
  ) {
    return this.catalogService.scheduleContent(
      id,
      body.premiereDate || '',
      body.changedBy || 'admin',
    );
  }

  // ===== Admin — géneros =====

  @Post('admin/genres')
  createGenre(@Body() body: { name: string; slug: string }) {
    return this.catalogService.createGenre(body.name, body.slug);
  }

  @Put('admin/genres/:id')
  updateGenre(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name: string; slug: string },
  ) {
    return this.catalogService.updateGenre(id, body.name, body.slug);
  }

  @Delete('admin/genres/:id')
  deleteGenre(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { changedBy?: string },
  ) {
    return this.catalogService.deleteGenre(id, body.changedBy || 'admin');
  }

  // ===== Admin — personas =====

  @Post('admin/people')
  createPerson(@Body() body: Record<string, unknown>) {
    return this.catalogService.createPerson(body);
  }

  @Put('admin/people/:id')
  updatePerson(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.catalogService.updatePerson({ ...body, personId: id });
  }

  @Delete('admin/people/:id')
  deletePerson(
    @Param('id') id: string,
    @Body() body: { changedBy?: string },
  ) {
    return this.catalogService.deletePerson(id, body.changedBy || 'admin');
  }

  @Post('admin/content/:id/cast')
  addPersonToContent(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.catalogService.addPersonToContent({ ...body, contentId: id });
  }

  @Delete('admin/content/:contentId/cast/:personId')
  removePersonFromContent(
    @Param('contentId') contentId: string,
    @Param('personId') personId: string,
    @Query('role_type') roleType: string,
  ) {
    return this.catalogService.removePersonFromContent(contentId, personId, roleType || 'ACTOR');
  }

  // ===== Admin — temporadas =====

  @Post('admin/content/:id/seasons')
  createSeason(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.catalogService.createSeason({ ...body, contentId: id });
  }

  @Delete('admin/seasons/:id')
  deleteSeason(
    @Param('id') id: string,
    @Body() body: { changedBy?: string },
  ) {
    return this.catalogService.deleteSeason(id, body.changedBy || 'admin');
  }

  // ===== Admin — auditoría (proxy HTTP → catalog-service:8082) =====

  @Get('admin/audit/logs')
  getAuditLogs(@Query() query: Record<string, string>, @Res() res: Response) {
    const qs = new URLSearchParams(query).toString();
    this.catalogService.proxyGet('/audit/logs', qs, res);
  }

  @Get('admin/audit/export')
  exportAudit(@Query() query: Record<string, string>, @Res() res: Response) {
    const qs = new URLSearchParams(query).toString();
    this.catalogService.proxyGet('/audit/export', qs, res);
  }

  // ===== Admin — upload GCS (proxy HTTP → catalog-service:8082) =====

  @Post('admin/upload')
  uploadFile(@Req() req: Request, @Res() res: Response) {
    this.catalogService.proxyPost('/admin/upload', req, res);
  }

  @Post('admin/upload-url')
  getUploadUrl(@Req() req: Request, @Res() res: Response) {
    this.catalogService.proxyPost('/admin/upload-url', req, res);
  }

  @Get('admin/download-url')
  getDownloadUrl(@Query() query: Record<string, string>, @Res() res: Response) {
    const qs = new URLSearchParams(query).toString();
    this.catalogService.proxyGet('/admin/download-url', qs, res);
  }

  // ===== Admin — episodios =====

  @Post('admin/seasons/:id/episodes')
  createEpisode(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.catalogService.createEpisode({ ...body, seasonId: id });
  }

  @Put('admin/episodes/:id')
  updateEpisode(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.catalogService.updateEpisode({ ...body, episodeId: id });
  }

  @Delete('admin/episodes/:id')
  deleteEpisode(
    @Param('id') id: string,
    @Body() body: { changedBy?: string },
  ) {
    return this.catalogService.deleteEpisode(id, body.changedBy || 'admin');
  }
}
