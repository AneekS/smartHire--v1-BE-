import { Request, Response } from 'express';
import { SkillsService } from './skills.service';
import { sendResponse } from '../../../../shared/utils/apiResponse';
const service = new SkillsService();
export const dummyHandler = async (req: Request, res: Response) => {
  const data = await service.dummyLogic();
  sendResponse(res, 200, data);
};