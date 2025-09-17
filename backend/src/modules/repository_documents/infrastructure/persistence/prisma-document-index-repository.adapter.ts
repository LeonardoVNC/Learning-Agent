import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { DocumentIndexRepositoryPort } from '../../domain/ports/document-index-repository.port';
import {
  DocumentIndex,
  IndexChapter,
  IndexSubtopic,
  Exercise,
  IndexStatus,
} from '../../domain/entities/document-index.entity';
import { IndexStatus as PrismaIndexStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class PrismaDocumentIndexRepositoryAdapter
  implements DocumentIndexRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async save(documentIndex: DocumentIndex): Promise<DocumentIndex> {
    try {
      // Verificar si ya existe un índice para este documento
      const existingIndex = await this.prisma.documentIndex.findUnique({
        where: { documentId: documentIndex.documentId },
      });

      if (existingIndex) {
        // Si existe, eliminarlo primero para evitar conflictos
        await this.deleteByDocumentId(documentIndex.documentId);
      }

      // Crear el índice con todos sus capítulos, subtemas y ejercicios
      const savedIndex = await this.prisma.documentIndex.create({
        data: {
          id: documentIndex.id,
          documentId: documentIndex.documentId,
          title: documentIndex.title,
          status: documentIndex.status,
          generatedAt: documentIndex.generatedAt,
          chapters: {
            create: documentIndex.chapters.map((chapter, chapterOrder) => ({
              id: this.generateChapterId(),
              title: chapter.title,
              description: chapter.description,
              order: chapterOrder,
              subtopics: {
                create: chapter.subtopics.map((subtopic, subtopicOrder) => ({
                  id: this.generateSubtopicId(),
                  title: subtopic.title,
                  description: subtopic.description,
                  order: subtopicOrder,
                  exercises: {
                    create: subtopic.exercises.map(
                      (exercise, exerciseOrder) => ({
                        id: this.generateExerciseId(),
                        type: exercise.type,
                        title: exercise.title,
                        description: exercise.description,
                        difficulty: exercise.difficulty,
                        estimatedTime: exercise.estimatedTime,
                        keywords: exercise.keywords || [],
                        order: exerciseOrder,
                      }),
                    ),
                  },
                })),
              },
              exercises: {
                create: chapter.exercises.map((exercise, exerciseOrder) => ({
                  id: this.generateExerciseId(),
                  type: exercise.type,
                  title: exercise.title,
                  description: exercise.description,
                  difficulty: exercise.difficulty,
                  estimatedTime: exercise.estimatedTime,
                  keywords: exercise.keywords || [],
                  order: exerciseOrder,
                })),
              },
            })),
          },
        },
        include: {
          chapters: {
            include: {
              subtopics: {
                include: {
                  exercises: true,
                },
                orderBy: { order: 'asc' },
              },
              exercises: {
                orderBy: { order: 'asc' },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      });

      console.log('Índice de documento guardado exitosamente:', {
        id: savedIndex.id,
        documentId: savedIndex.documentId,
        title: savedIndex.title,
        chaptersCount: savedIndex.chapters.length,
        status: savedIndex.status,
      });

      return this.mapToDomainEntity(savedIndex);
    } catch (error) {
      console.error('Error guardando índice de documento:', error);
      throw new Error(`Error guardando índice: ${error.message}`);
    }
  }

  async findByDocumentId(documentId: string): Promise<DocumentIndex | null> {
    try {
      const documentIndex = await this.prisma.documentIndex.findUnique({
        where: { documentId },
        include: {
          chapters: {
            include: {
              subtopics: {
                include: {
                  exercises: true,
                },
                orderBy: { order: 'asc' },
              },
              exercises: {
                orderBy: { order: 'asc' },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!documentIndex) {
        return null;
      }

      return this.mapToDomainEntity(documentIndex);
    } catch (error) {
      console.error('Error buscando índice para documento:', documentId, error);
      throw new Error(`Error buscando índice: ${error.message}`);
    }
  }

  async findById(id: string): Promise<DocumentIndex | null> {
    try {
      const documentIndex = await this.prisma.documentIndex.findUnique({
        where: { id },
        include: {
          chapters: {
            include: {
              subtopics: {
                include: {
                  exercises: true,
                },
                orderBy: { order: 'asc' },
              },
              exercises: {
                orderBy: { order: 'asc' },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!documentIndex) {
        return null;
      }

      return this.mapToDomainEntity(documentIndex);
    } catch (error) {
      console.error('Error buscando índice por ID:', id, error);
      throw new Error(`Error buscando índice: ${(error as Error).message}`);
    }
  }

  async update(
    id: string,
    documentIndex: Partial<DocumentIndex>,
  ): Promise<DocumentIndex> {
    try {
      const updatedIndex = await this.prisma.documentIndex.update({
        where: { id },
        data: {
          title: documentIndex.title,
          status: documentIndex.status,
          updatedAt: new Date(),
        },
        include: {
          chapters: {
            include: {
              subtopics: {
                include: {
                  exercises: true,
                },
                orderBy: { order: 'asc' },
              },
              exercises: {
                orderBy: { order: 'asc' },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      });

      return this.mapToDomainEntity(updatedIndex);
    } catch (error) {
      console.error('Error actualizando índice:', id, error);
      throw new Error(`Error actualizando índice: ${(error as Error).message}`);
    }
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    try {
      await this.prisma.documentIndex.deleteMany({
        where: { documentId },
      });
      console.log('Índice eliminado para documento:', documentId);
    } catch (error) {
      console.error(
        'Error eliminando índice para documento:',
        documentId,
        error,
      );
      throw new Error(`Error eliminando índice: ${(error as Error).message}`);
    }
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    status?: string;
  }): Promise<{ items: DocumentIndex[]; total: number }> {
    try {
      const { skip = 0, take = 50, status } = options || {};

      const where = status ? { status: status as PrismaIndexStatus } : {};

      const [items, total] = await Promise.all([
        this.prisma.documentIndex.findMany({
          where,
          skip,
          take,
          include: {
            chapters: {
              include: {
                subtopics: {
                  include: {
                    exercises: true,
                  },
                  orderBy: { order: 'asc' },
                },
                exercises: {
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { generatedAt: 'desc' },
        }),
        this.prisma.documentIndex.count({ where }),
      ]);

      return {
        items: items.map((item) => this.mapToDomainEntity(item)),
        total,
      };
    } catch (error) {
      console.error('Error listando índices:', error);
      throw new Error(`Error listando índices: ${(error as Error).message}`);
    }
  }

  // Métodos privados
  private generateChapterId(): string {
    return randomUUID();
  }

  private generateSubtopicId(): string {
    return randomUUID();
  }

  private generateExerciseId(): string {
    return randomUUID();
  }

  private mapToDomainEntity(prismaIndex: any): DocumentIndex {
    const chapters = prismaIndex.chapters.map(
      (chapter: any) =>
        new IndexChapter(
          chapter.title,
          chapter.description || '',
          chapter.subtopics.map(
            (subtopic: any) =>
              new IndexSubtopic(
                subtopic.title,
                subtopic.description || '',
                subtopic.exercises.map(
                  (exercise: any) =>
                    new Exercise(
                      exercise.type,
                      exercise.title,
                      exercise.description,
                      exercise.difficulty,
                      exercise.estimatedTime,
                      exercise.keywords,
                    ),
                ),
              ),
          ),
          chapter.exercises.map(
            (exercise: any) =>
              new Exercise(
                exercise.type,
                exercise.title,
                exercise.description,
                exercise.difficulty,
                exercise.estimatedTime,
                exercise.keywords,
              ),
          ),
        ),
    );

    return new DocumentIndex(
      prismaIndex.id,
      prismaIndex.documentId,
      prismaIndex.title,
      chapters,
      prismaIndex.generatedAt,
      prismaIndex.status,
    );
  }
}
