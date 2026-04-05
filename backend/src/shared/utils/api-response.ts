import { Response } from 'express';

interface ApiResponseData<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export class ApiResponse {
  static ok<T>(res: Response, data: T, message = 'Operación exitosa') {
    return res.status(200).json({
      success: true,
      message,
      data,
    } as ApiResponseData<T>);
  }

  static created<T>(res: Response, data: T, message = 'Recurso creado exitosamente') {
    return res.status(201).json({
      success: true,
      message,
      data,
    } as ApiResponseData<T>);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    message = 'Operación exitosa'
  ) {
    return res.status(200).json({
      success: true,
      message,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    } as ApiResponseData<T[]>);
  }

  static badRequest(res: Response, message = 'Solicitud inválida', errors?: Record<string, string[]>) {
    return res.status(400).json({
      success: false,
      message,
      errors,
    } as ApiResponseData<null>);
  }

  static unauthorized(res: Response, message = 'No autorizado') {
    return res.status(401).json({
      success: false,
      message,
    } as ApiResponseData<null>);
  }

  static forbidden(res: Response, message = 'Acceso denegado') {
    return res.status(403).json({
      success: false,
      message,
    } as ApiResponseData<null>);
  }

  static notFound(res: Response, message = 'Recurso no encontrado') {
    return res.status(404).json({
      success: false,
      message,
    } as ApiResponseData<null>);
  }

  static conflict(res: Response, message = 'Conflicto con el estado actual') {
    return res.status(409).json({
      success: false,
      message,
    } as ApiResponseData<null>);
  }

  static error(res: Response, message = 'Error interno del servidor') {
    return res.status(500).json({
      success: false,
      message,
    } as ApiResponseData<null>);
  }
}
