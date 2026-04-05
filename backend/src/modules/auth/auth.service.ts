import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { jwtConfig } from '../../config/jwt';
import { JwtPayload } from '../../shared/middleware/auth.middleware';
import { LoginInput, PinLoginInput } from './auth.schemas';

export class AuthService {
  async login(input: LoginInput) {
    const usuario = await prisma.usuario.findUnique({
      where: { username: input.username },
      include: {
        roles: {
          include: { rol: true },
        },
      },
    });

    if (!usuario || !usuario.activo) {
      throw new Error('Credenciales inválidas');
    }

    const validPassword = await bcrypt.compare(input.password, usuario.passwordHash);
    if (!validPassword) {
      throw new Error('Credenciales inválidas');
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date() },
    });

    const token = this.generateToken(usuario);

    return {
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        roles: usuario.roles.map((ur) => ur.rol.nombre),
      },
    };
  }

  async loginWithPin(input: PinLoginInput) {
    const usuario = await prisma.usuario.findFirst({
      where: { pin: input.pin, activo: true },
      include: {
        roles: {
          include: { rol: true },
        },
      },
    });

    if (!usuario) {
      throw new Error('PIN inválido');
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date() },
    });

    const token = this.generateToken(usuario);

    return {
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        roles: usuario.roles.map((ur) => ur.rol.nombre),
      },
    };
  }

  async getProfile(userId: string) {
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { rol: true },
        },
      },
    });

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    return {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      telefono: usuario.telefono,
      roles: usuario.roles.map((ur) => ur.rol.nombre),
      permisos: this.extractPermisos(usuario.roles.map((ur) => ur.rol)),
      ultimoLogin: usuario.ultimoLogin,
    };
  }

  private generateToken(usuario: any): string {
    const roles = usuario.roles.map((ur: any) => ur.rol.nombre);
    const permisos = this.extractPermisos(usuario.roles.map((ur: any) => ur.rol));

    const payload: JwtPayload = {
      userId: usuario.id,
      username: usuario.username,
      roles,
      permisos,
    };

    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiration,
    } as jwt.SignOptions);
  }

  private extractPermisos(roles: any[]): string[] {
    const allPermisos = new Set<string>();
    roles.forEach((rol) => {
      const permisos = rol.permisos as string[];
      permisos.forEach((p) => allPermisos.add(p));
    });
    return Array.from(allPermisos);
  }
}
