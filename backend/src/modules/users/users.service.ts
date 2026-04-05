import bcrypt from 'bcryptjs';
import prisma from '../../config/database';
import { CreateUserInput, UpdateUserInput } from './users.schemas';

export class UsersService {
  async findAll(page: number, limit: number, search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { apellido: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { roles: { include: { rol: true } } },
        orderBy: { creadoEn: 'desc' },
      }),
      prisma.usuario.count({ where }),
    ]);

    return {
      data: usuarios.map(this.formatUser),
      total,
    };
  }

  async getRoles() {
    return prisma.rol.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findById(id: string) {
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: { roles: { include: { rol: true } } },
    });

    if (!usuario) throw new Error('Usuario no encontrado');
    return this.formatUser(usuario);
  }

  async create(input: CreateUserInput) {
    const passwordHash = await bcrypt.hash(input.password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash,
        nombre: input.nombre,
        apellido: input.apellido,
        telefono: input.telefono,
        pin: input.pin,
        roles: input.roleIds
          ? { create: input.roleIds.map((rolId) => ({ rolId })) }
          : undefined,
      },
      include: { roles: { include: { rol: true } } },
    });

    return this.formatUser(usuario);
  }

  async update(id: string, input: UpdateUserInput) {
    const usuario = await prisma.usuario.update({
      where: { id },
      data: input,
      include: { roles: { include: { rol: true } } },
    });

    return this.formatUser(usuario);
  }

  async changePassword(id: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.usuario.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async assignRoles(id: string, roleIds: string[]) {
    await prisma.usuarioRol.deleteMany({ where: { usuarioId: id } });
    await prisma.usuarioRol.createMany({
      data: roleIds.map((rolId) => ({ usuarioId: id, rolId })),
    });

    return this.findById(id);
  }

  async delete(id: string) {
    await prisma.usuario.update({
      where: { id },
      data: { activo: false },
    });
  }

  private formatUser(usuario: any) {
    return {
      id: usuario.id,
      username: usuario.username,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      telefono: usuario.telefono,
      activo: usuario.activo,
      roles: usuario.roles?.map((ur: any) => ({
        id: ur.rol.id,
        nombre: ur.rol.nombre,
      })) || [],
      ultimoLogin: usuario.ultimoLogin,
      creadoEn: usuario.creadoEn,
    };
  }
}
