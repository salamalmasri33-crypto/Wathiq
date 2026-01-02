export type AddDocumentForm = {
  title?: string;
  file: File;
  targetUserId?: string; // إذا بتستخدمها
};

export type UpdateDocumentForm = {
  title?: string;
  file?: File;
};
export type UpsertMetadataDto = {
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
  department?: string | null;
  documentType?: string | null;
  expirationDate?: string | null; // ISO
};
export type SearchDocumentsDto = {
  query?: string | null;
  category?: string | null;
  department?: string | null;
  fromDate?: string | null; // ISO or yyyy-mm-dd (حسب الباك)
  toDate?: string | null;
  sortBy?: string | null;
  desc?: boolean | null;
};
