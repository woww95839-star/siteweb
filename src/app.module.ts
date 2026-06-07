import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ProductsModule } from './products/products.module';
import { StockModule } from './stock/stock.module';
import { OrdersModule } from './orders/orders.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PromotionsModule } from './promotions/promotions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './config/prisma.module';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import databaseConfig from './config/database.config';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, databaseConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'general',
        ttl: 900000,
        limit: 100,
      },
    ]),
    PrismaModule,
    SecurityModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    SuppliersModule,
    ProductsModule,
    StockModule,
    OrdersModule,
    InvoicesModule,
    PromotionsModule,
    DashboardModule,
    NotificationsModule,
  ],
})
export class AppModule {}
