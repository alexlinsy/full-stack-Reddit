"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration20230330224813 = void 0;
const migrations_1 = require("@mikro-orm/migrations");
class Migration20230330224813 extends migrations_1.Migration {
    async up() {
        this.addSql('create table "post" ("id" serial primary key, "title" text not null, "created_at" timestamptz(0) not null, "update_at" timestamptz(0) not null);');
    }
    async down() {
        this.addSql('drop table if exists "post" cascade;');
    }
}
exports.Migration20230330224813 = Migration20230330224813;
//# sourceMappingURL=Migration20230330224813.js.map