import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,
} from 'class-validator';

export function ValidateCorrectAnswer(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'validateCorrectAnswer',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    const kind = (args.object as any).kind;

                    if (kind === 'MULTIPLE_CHOICE') {
                        return typeof value === 'number' && value >= 0;
                    }

                    if (kind === 'TRUE_FALSE') {
                        return typeof value === 'boolean';
                    }

                    if (kind === 'OPEN_ANALYSIS' || kind === 'OPEN_EXERCISE') {
                        return value === null || value === undefined;
                    }

                    return true; 
                },
                defaultMessage(args: ValidationArguments) {
                    const kind = (args.object as any).kind;
                    if (kind === 'MULTIPLE_CHOICE') {
                        return 'correctAnswer debe ser un número >= 0 para preguntas de opción múltiple.';
                    }
                    if (kind === 'TRUE_FALSE') {
                        return 'correctAnswer debe ser boolean para preguntas de Verdadero/Falso.';
                    }
                    if (kind === 'OPEN_ANALYSIS' || kind === 'OPEN_EXERCISE') {
                        return 'correctAnswer debe ser null para preguntas abiertas.';
                    }
                    return 'Valor inválido para correctAnswer.';
                },
            },
        });
    };
}
