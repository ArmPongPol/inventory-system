import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1790914938897 implements MigrationInterface {
  name = 'InitialSchema1790914938897';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // uuid_generate_v4() below. TypeORM also creates it on connect, but the
    // migration must not depend on that.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_categories_name" UNIQUE ("name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "units" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(50) NOT NULL, "symbol" character varying(20) NOT NULL, CONSTRAINT "UQ_units_symbol" UNIQUE ("symbol"), CONSTRAINT "UQ_units_name" UNIQUE ("name"), CONSTRAINT "PK_5a8f2f064919b587d93936cb223" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sku" character varying(50) NOT NULL, "name" character varying(255) NOT NULL, "category_id" uuid, "unit_id" uuid, "minimum_stock" numeric(18,4) NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_products_sku" UNIQUE ("sku"), CONSTRAINT "CHK_products_minimum_stock" CHECK ("minimum_stock" >= 0), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a5f6868c96e0069e699f33e12" ON "products"  ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0b97249dd9e17bbc604a5ba3d0" ON "products"  ("unit_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "warehouses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(50) NOT NULL, "name" character varying(150) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_warehouses_code" UNIQUE ("code"), CONSTRAINT "PK_56ae21ee2432b2270b48867e4be" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL, "quantity" numeric(18,4) NOT NULL DEFAULT '0', "reserved_quantity" numeric(18,4) NOT NULL DEFAULT '0', "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_inventory_product_warehouse" UNIQUE ("product_id", "warehouse_id"), CONSTRAINT "CHK_inventory_reserved_within_quantity" CHECK ("reserved_quantity" <= "quantity"), CONSTRAINT "CHK_inventory_reserved_quantity" CHECK ("reserved_quantity" >= 0), CONSTRAINT "CHK_inventory_quantity" CHECK ("quantity" >= 0), CONSTRAINT "PK_82aa5da437c5bbfb80703b08309" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5d9d73a4c5fe0202714a51e464" ON "inventory"  ("warehouse_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'USER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "username" character varying(320) NOT NULL, "email" character varying(320) NOT NULL, "password" character varying NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "role" "public"."users_role_enum" NOT NULL, "status" "public"."users_status_enum" NOT NULL DEFAULT 'ACTIVE', CONSTRAINT "UQ_users_username" UNIQUE ("username"), CONSTRAINT "UQ_users_email" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON "users"  ("role") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3676155292d72c67cd4e090514" ON "users"  ("status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."stock_movement_type_enum" AS ENUM('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_movements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "warehouse_id" uuid NOT NULL, "movement_type" "public"."stock_movement_type_enum" NOT NULL, "quantity" numeric(18,4) NOT NULL, "before_quantity" numeric(18,4) NOT NULL, "after_quantity" numeric(18,4) NOT NULL, "reference_type" character varying(50), "reference_id" uuid, "remark" character varying(500), "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(), CONSTRAINT "CHK_stock_movements_non_negative" CHECK ("before_quantity" >= 0 AND "after_quantity" >= 0), CONSTRAINT "CHK_stock_movements_after_quantity" CHECK ("after_quantity" = "before_quantity" + "quantity"), CONSTRAINT "CHK_stock_movements_quantity_nonzero" CHECK ("quantity" <> 0), CONSTRAINT "PK_57a26b190618550d8e65fb860e7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bed9ede4e01a5a8072732a9415" ON "stock_movements"  ("reference_type", "reference_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_45907b07242a51dd836ca9cd8e" ON "stock_movements"  ("warehouse_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0629673167b53d183512499abf" ON "stock_movements"  ("product_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "generation" integer NOT NULL DEFAULT '0', "rotated_at" TIMESTAMP WITH TIME ZONE NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9190032f6967b7971dca07d69f3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a7ab4fd82c654c85b9de53d971" ON "refresh_sessions"  ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_0b97249dd9e17bbc604a5ba3d07" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory" ADD CONSTRAINT "FK_732fdb1f76432d65d2c136340dc" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory" ADD CONSTRAINT "FK_5d9d73a4c5fe0202714a51e4649" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_2c1bb05b80ddcc562cd28d826c6" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_e7831147f5a8ee3c42e6eaeee2e" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_0d3747894dc26f5f5c34f640d23" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_sessions" ADD CONSTRAINT "FK_a7ab4fd82c654c85b9de53d971a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_sessions" DROP CONSTRAINT "FK_a7ab4fd82c654c85b9de53d971a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_0d3747894dc26f5f5c34f640d23"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_e7831147f5a8ee3c42e6eaeee2e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_2c1bb05b80ddcc562cd28d826c6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory" DROP CONSTRAINT "FK_5d9d73a4c5fe0202714a51e4649"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory" DROP CONSTRAINT "FK_732fdb1f76432d65d2c136340dc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_0b97249dd9e17bbc604a5ba3d07"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a7ab4fd82c654c85b9de53d971"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_sessions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0629673167b53d183512499abf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_45907b07242a51dd836ca9cd8e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bed9ede4e01a5a8072732a9415"`,
    );
    await queryRunner.query(`DROP TABLE "stock_movements"`);
    await queryRunner.query(`DROP TYPE "public"."stock_movement_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3676155292d72c67cd4e090514"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ace513fa30d485cfd25c11a9e4"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5d9d73a4c5fe0202714a51e464"`,
    );
    await queryRunner.query(`DROP TABLE "inventory"`);
    await queryRunner.query(`DROP TABLE "warehouses"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0b97249dd9e17bbc604a5ba3d0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9a5f6868c96e0069e699f33e12"`,
    );
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TABLE "units"`);
    await queryRunner.query(`DROP TABLE "categories"`);
  }
}
