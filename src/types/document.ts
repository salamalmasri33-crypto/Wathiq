export type Owner = {
  id: string;
  name: string;
  email?: string | null;
};

export type Metadata = {
  id?: string | null;
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
  department?: string | null;
  documentType?: string | null;
  expirationDate?: string | null; // ISO string
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type Document = {
  id: string;
  documentId?: number | null;

  title?: string | null;
  content?: string | null;

  fileName?: string | null;
  contentType?: string | null;
  size?: number | null;

  fileHash?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;

  userId?: string | null;
  department?: string | null;

  metadata?: Metadata | null;

  // ✅ خيار 1 (تعديل الباك): owner ضمن response تبع view/search
  owner?: Owner | null;
};
