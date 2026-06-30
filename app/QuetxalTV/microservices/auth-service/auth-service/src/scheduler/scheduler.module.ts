import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { SchedulerRepository } from './scheduler.repository';

/**
 * SchedulerModule
 *
 * Registra el ScheduleModule de NestJS (que habilita los @Cron decorators)
 * y provee el servicio + repositorio del cronjob de mantenimiento.
 *
 * Para que funcione, este módulo debe importarse en AppModule.
 */
@Module({
  imports: [
    // ScheduleModule.forRoot() inicia el motor de tareas programadas de NestJS.
    // Solo debe llamarse UNA VEZ en toda la aplicación (aquí lo encapsulamos).
    ScheduleModule.forRoot(),
  ],
  providers: [
    SchedulerService,    // contiene los @Cron handlers
    SchedulerRepository, // contiene las queries SQL
  ],
  // No necesitamos exportar nada; el scheduler corre solo en background.
})
export class SchedulerModule {}