"use server";
import db from "@/dev/dev";
import { z } from "zod";
import fs from "fs/promises";
import { notFound, redirect } from "next/navigation";

// Schemas
const fileSchema = z.instanceof(File, { message: "Required" });
const imageSchema = fileSchema.refine(
  (file) => file.size === 0 || file.type.startsWith("image/")
);
const addSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.coerce.number().int().min(1),
  file: fileSchema.refine((file) => file.size > 0, "Required"),
  image: imageSchema.refine((file) => file.size > 0, "Required"),
});
const editSchema = addSchema.extend({
  file: fileSchema.optional(),
  image: imageSchema.optional(),
});

// Add Product into DB
export async function addProduct(prevState: unknown, formData: FormData) {
  //   Validate through Schema
  const result = addSchema.safeParse(Object.fromEntries(formData.entries()));

  // If errors found
  if (result.success == false) return result.error.formErrors.fieldErrors;

  const data = result.data;

  // Handle Files
  await fs.mkdir("products", { recursive: true });
  const filePath = `products/${crypto.randomUUID()}-${data.file.name}`;
  await fs.writeFile(filePath, Buffer.from(await data.file.arrayBuffer()));
  await fs.mkdir("public/products", { recursive: true });
  const imagePath = `/products/${crypto.randomUUID()}-${data.image.name}`;
  await fs.writeFile(
    `public${imagePath}`,
    Buffer.from(await data.image.arrayBuffer())
  );

  // Add into DB
  await db.product.create({
    data: {
      isAvailable: false,
      name: data.name,
      description: data.description,
      price: data.price,
      filePath,
      imagePath,
    },
  });

  redirect("/admin/products");
}

// Edit Product data
export async function updateProduct(
  id: string,
  prevState: unknown,
  formData: FormData
) {
  //   Validate through Schema
  const result = editSchema.safeParse(Object.fromEntries(formData.entries()));

  // If errors found
  if (result.success == false) return result.error.formErrors.fieldErrors;

  const data = result.data;
  const product = await db.product.findUnique({ where: { id } });
  if (product == null) return notFound();

  // Handle Files
  let filePath = product.filePath;
  if (data.file != null && data.file.size > 0) {
    fs.unlink(product.filePath);
    filePath = `products/${crypto.randomUUID()}-${data.file.name}`;
    await fs.writeFile(filePath, Buffer.from(await data.file.arrayBuffer()));
  }
  let imagePath = product.imagePath;
  if (data.image != null && data.image.size > 0) {
    fs.unlink(`public${product.imagePath}`);
    imagePath = `/products/${crypto.randomUUID()}-${data.image.name}`;
    await fs.writeFile(
      `public${imagePath}`,
      Buffer.from(await data.image.arrayBuffer())
    );
  }

  // Update in DB
  await db.product.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      filePath,
      imagePath,
    },
  });

  redirect("/admin/products");
}

// Toggle Product Availability
export async function toggleProductAvailability(
  id: string,
  isAvailable: boolean
) {
  await db.product.update({ where: { id }, data: { isAvailable } });
}

// Delete Product data
export async function deleteProduct(id: string) {
  const product = await db.product.delete({ where: { id } });

  if (product === null) return notFound();

  // Remove files when product deleted
  fs.unlink(product.filePath);
  fs.unlink(`public${product.imagePath}`);
}
