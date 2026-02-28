import { Request, Response } from 'express';
import { CareerIntentService } from './career-intent.service';
import { sendResponse } from '../../../../shared/utils/apiResponse';
const service = new CareerIntentService();
export const dummyHandler = async (req: Request, res: Response) => {
  const data = await service.dummyLogic();
  sendResponse(res, 200, data);
};