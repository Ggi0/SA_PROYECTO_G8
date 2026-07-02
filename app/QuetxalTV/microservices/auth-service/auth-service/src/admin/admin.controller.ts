import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuditService} from './admin.service';

@Controller()
export class AdminController {
  constructor(private readonly adminService: AuditService) {}

  // GET audit logs
  @GrpcMethod('AuthService', 'GetAuditLogs')
  getAuditLogs(data: any) {
    return this.adminService.getAuditLogs(data);
  }

  // EXPORT audit logs
  @GrpcMethod('AuthService', 'ExportAuditLogs')
  exportAuditLogs(data: any) {
    return this.adminService.exportAuditLogs(data);
  }



  @GrpcMethod('AuthService', 'GetAllUsersWithProfiles')
getAllUsersWithProfiles(data: any) {
  return this.adminService.getAllUsersWithProfiles(data);
}

@GrpcMethod('AuthService', 'GetAuditEventLogs')
getAuditEventLogs(data: any) {
  return this.adminService.getAuditEventLogs(data);
}



}
