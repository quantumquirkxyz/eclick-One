// Application services import domain contracts, while concrete repository
// implementations are composed in database/database.ts. Re-exporting contracts
// here gives the API an explicit repository boundary without coupling to mssql.
export type {
  ClientRepository,
  CommerceRepositories,
  InventoryRepository,
  OrderRepository,
  PaymentRepository,
  ProductRepository,
  ProvinceRepository,
} from "@eclick-one/domain";
