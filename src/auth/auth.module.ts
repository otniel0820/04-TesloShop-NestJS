import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports: [
    TypeOrmModule.forFeature([User])
  ],
  exports: [TypeOrmModule] // Exporta el módulo TypeOrmModule para que pueda ser usado en otros módulos. Esto permite que los módulos que lo requieran puedan acceder a la base de datos.
})
export class AuthModule {}
