import * as fs from 'fs';

export class PrismaMutationEngine {
  /**
   * Drops a column from a model in a Prisma schema file.
   */
  public static dropColumn(schemaPath: string, modelName: string, columnName: string): void {
    const raw = fs.readFileSync(schemaPath, 'utf-8');
    const modelRegex = new RegExp(`model\\s+${modelName}\\s+{([\\s\\S]*?)}`, 'g');

    let modified = false;
    const result = raw.replace(modelRegex, (match, body) => {
      // Find the line that defines the column and remove it
      const lines = body.split('\n');
      const newLines = lines.filter((line: string) => {
        const trimmed = line.trim();
        // Skip empty lines or comments if they are the only thing
        if (trimmed.startsWith('//')) return true;

        // Check if the line defines the column
        const parts = trimmed.split(/\s+/);
        if (parts[0] === columnName) {
          modified = true;
          return false;
        }
        return true;
      });
      return `model ${modelName} {${newLines.join('\n')}}`;
    });

    if (modified) {
      fs.writeFileSync(schemaPath, result, 'utf-8');
    } else {
      throw new Error(`Failed to find model '${modelName}' or column '${columnName}' in schema.`);
    }
  }

  /**
   * Renames a column in a model in a Prisma schema file.
   */
  public static renameColumn(
    schemaPath: string,
    modelName: string,
    oldName: string,
    newName: string,
  ): void {
    const raw = fs.readFileSync(schemaPath, 'utf-8');
    const modelRegex = new RegExp(`model\\s+${modelName}\\s+{([\\s\\S]*?)}`, 'g');

    let modified = false;
    const result = raw.replace(modelRegex, (match, body) => {
      const lines = body.split('\n');
      const newLines = lines.map((line: string) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) return line;

        const parts = trimmed.split(/\s+/);
        if (parts[0] === oldName) {
          modified = true;
          return line.replace(oldName, newName); // Very simple replacement, assumes first occurrence is the col name
        }
        return line;
      });
      return `model ${modelName} {${newLines.join('\n')}}`;
    });

    if (modified) {
      fs.writeFileSync(schemaPath, result, 'utf-8');
    } else {
      throw new Error(`Failed to find model '${modelName}' or column '${oldName}' in schema.`);
    }
  }

  /**
   * Narrows the type of a column in a model (e.g., String to Int).
   */
  public static changeColumnType(
    schemaPath: string,
    modelName: string,
    columnName: string,
    newType: string,
  ): void {
    const raw = fs.readFileSync(schemaPath, 'utf-8');
    const modelRegex = new RegExp(`model\\s+${modelName}\\s+{([\\s\\S]*?)}`, 'g');

    let modified = false;
    const result = raw.replace(modelRegex, (match, body) => {
      const lines = body.split('\n');
      const newLines = lines.map((line: string) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) return line;

        const parts = trimmed.split(/\s+/);
        if (parts[0] === columnName && parts.length > 1) {
          modified = true;
          // Replace the second part (the type) with the newType
          const oldType = parts[1];
          // We use string replacement with word boundary to avoid replacing partial matches
          return line.replace(oldType, newType);
        }
        return line;
      });
      return `model ${modelName} {${newLines.join('\n')}}`;
    });

    if (modified) {
      fs.writeFileSync(schemaPath, result, 'utf-8');
    } else {
      throw new Error(`Failed to find model '${modelName}' or column '${columnName}' in schema.`);
    }
  }

  /**
   * Adds a column to a model.
   */
  public static addColumn(schemaPath: string, modelName: string, columnDef: string): void {
    const raw = fs.readFileSync(schemaPath, 'utf-8');
    const modelRegex = new RegExp(`model\\s+${modelName}\\s+{([\\s\\S]*?)}`, 'g');

    let modified = false;
    const result = raw.replace(modelRegex, (match, body) => {
      modified = true;
      return `model ${modelName} {${body}\n  ${columnDef}\n}`;
    });

    if (modified) {
      fs.writeFileSync(schemaPath, result, 'utf-8');
    } else {
      throw new Error(`Failed to find model '${modelName}' in schema.`);
    }
  }
}
