import { Request, Response } from 'express';
import { ExperienceService } from './experience.service';
import { sendResponse } from '../../../../shared/utils/apiResponse';
const service = new ExperienceService();
export const dummyHandler = async (req: Request, res: Response) => {
  const data = await service.dummyLogic();
  sendResponse(res, 200, data);
};