import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, conversations, crmChannelIdentities, crmContacts, crmConversationContacts, crmLeads } from "@workspace/db/node";
import { randomUUID } from "node:crypto";
import type { RequestContext } from "../../auth/request-context.js";
import type { CreateContactDto, ListContactsQueryDto, UpdateContactDto } from "./contacts.dto.js";

@Injectable()
export class ContactsService {
  private clean(value: string | undefined, max: number) { const result = value?.trim(); return result ? result.slice(0, max) : null; }
  private tags(tags: string[] | undefined) { return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))].slice(0, 20); }
  private values(dto: CreateContactDto | UpdateContactDto) {
    const displayName = dto.displayName === undefined ? undefined : this.clean(dto.displayName, 200);
    if (dto.displayName !== undefined && !displayName) throw new BadRequestException("Contact name cannot be empty");
    return { ...(displayName !== undefined ? { displayName } : {}), ...(dto.phone !== undefined ? { phone: this.clean(dto.phone.replace(/[^+\d\s().-]/g, ""), 40) } : {}), ...(dto.email !== undefined ? { email: this.clean(dto.email.toLowerCase(), 320) } : {}), ...(dto.notes !== undefined ? { notes: this.clean(dto.notes, 2000) } : {}), ...(dto.tags !== undefined ? { tags: this.tags(dto.tags) } : {}) };
  }
  async list(ctx: RequestContext, query: ListContactsQueryDto) {
    const conditions = [eq(crmContacts.organizationId, ctx.organizationId)];
    if (query.search?.trim()) { const term = `%${query.search.trim().replace(/[\\%_]/g, "\\$&")}%`; conditions.push(or(ilike(crmContacts.displayName, term), ilike(crmContacts.phone, term), ilike(crmContacts.email, term))!); }
    if (query.tag?.trim()) conditions.push(sql`${query.tag.trim()} = ANY(${crmContacts.tags})`);
    const page = query.page ?? 1, limit = query.limit ?? 20;
    const order = query.sort === "name" ? asc(crmContacts.displayName) : query.sort === "created" ? desc(crmContacts.createdAt) : desc(crmContacts.updatedAt);
    const [items, count] = await Promise.all([db.select().from(crmContacts).where(and(...conditions)).orderBy(order, desc(crmContacts.id)).limit(limit).offset((page - 1) * limit), db.select({ count: sql<number>`count(*)::int` }).from(crmContacts).where(and(...conditions))]);
    return { items, page, limit, total: count[0]?.count ?? 0 };
  }
  async get(ctx: RequestContext, id: string) { const [contact] = await db.select().from(crmContacts).where(and(eq(crmContacts.organizationId, ctx.organizationId), eq(crmContacts.id, id))).limit(1); if (!contact) throw new NotFoundException("Contact not found"); return contact; }
  async create(ctx: RequestContext, dto: CreateContactDto) { const values = this.values(dto); const [contact] = await db.insert(crmContacts).values({ id: randomUUID(), organizationId: ctx.organizationId, ...values }).returning(); return contact; }
  async update(ctx: RequestContext, id: string, dto: UpdateContactDto) { await this.get(ctx, id); const [contact] = await db.update(crmContacts).set({ ...this.values(dto), updatedAt: new Date() }).where(and(eq(crmContacts.organizationId, ctx.organizationId), eq(crmContacts.id, id))).returning(); return contact; }
  async remove(ctx: RequestContext, id: string) { await this.get(ctx, id); const [identity, lead] = await Promise.all([db.select({ id: crmChannelIdentities.id }).from(crmChannelIdentities).where(and(eq(crmChannelIdentities.organizationId, ctx.organizationId), eq(crmChannelIdentities.contactId, id))).limit(1), db.select({ id: crmLeads.id }).from(crmLeads).where(and(eq(crmLeads.organizationId, ctx.organizationId), eq(crmLeads.contactId, id))).limit(1)]); if (identity || lead) throw new ConflictException("Cannot delete a contact with channel identities or leads"); await db.delete(crmContacts).where(and(eq(crmContacts.organizationId, ctx.organizationId), eq(crmContacts.id, id))); return { success: true, id }; }
  async detail(ctx: RequestContext, id: string) { const contact = await this.get(ctx, id); const [identities, linked] = await Promise.all([db.select().from(crmChannelIdentities).where(and(eq(crmChannelIdentities.organizationId, ctx.organizationId), eq(crmChannelIdentities.contactId, id))), db.select({ id: conversations.id, status: conversations.status, createdAt: conversations.createdAt, updatedAt: conversations.updatedAt }).from(crmConversationContacts).innerJoin(conversations, and(eq(crmConversationContacts.conversationId, conversations.id), eq(crmConversationContacts.organizationId, conversations.organizationId))).where(and(eq(crmConversationContacts.organizationId, ctx.organizationId), eq(crmConversationContacts.contactId, id))).orderBy(desc(conversations.updatedAt))]); return { ...contact, identities, conversations: linked }; }
  async link(ctx: RequestContext, conversationId: string, contactId: string) { await this.get(ctx, contactId); const [conversation] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.organizationId, ctx.organizationId), eq(conversations.id, conversationId))).limit(1); if (!conversation) throw new NotFoundException("Conversation not found"); const [existing] = await db.select().from(crmConversationContacts).where(and(eq(crmConversationContacts.organizationId, ctx.organizationId), eq(crmConversationContacts.conversationId, conversationId))).limit(1); if (existing && existing.contactId !== contactId) throw new ConflictException("Conversation is already linked to another contact"); if (existing) return existing; const [link] = await db.insert(crmConversationContacts).values({ organizationId: ctx.organizationId, conversationId, contactId, linkedByUserId: ctx.userId }).returning(); return link; }
  async unlink(ctx: RequestContext, conversationId: string) { const [deleted] = await db.delete(crmConversationContacts).where(and(eq(crmConversationContacts.organizationId, ctx.organizationId), eq(crmConversationContacts.conversationId, conversationId))).returning(); if (!deleted) throw new NotFoundException("Contact link not found"); return { success: true }; }
  async conversationContact(ctx: RequestContext, conversationId: string) { const [row] = await db.select({ link: crmConversationContacts, contact: crmContacts }).from(crmConversationContacts).innerJoin(crmContacts, and(eq(crmConversationContacts.contactId, crmContacts.id), eq(crmConversationContacts.organizationId, crmContacts.organizationId))).where(and(eq(crmConversationContacts.organizationId, ctx.organizationId), eq(crmConversationContacts.conversationId, conversationId))).limit(1); return row ?? null; }
}
