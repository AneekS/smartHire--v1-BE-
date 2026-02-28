import { Response } from 'express';
export const sendResponse = (res: Response, statusCode: number, data: any) => res.status(statusCode).json({ success: statusCode >= 200 && statusCode < 300, data });
export const sendPaginatedResponse = (res: Response, items: any[], meta: any) => res.json({ success: true, data: { items, meta } });