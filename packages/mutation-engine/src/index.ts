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
      // Add the new column at the end of the model body
      return `model ${modelName} {${body}\n  ${columnDef}\n}`;
    });

    if (modified) {
      fs.writeFileSync(schemaPath, result, 'utf-8');
    } else {
      throw new Error(`Failed to find model '${modelName}' in schema.`);
    }
  }

  public static addRequiredColumn(schemaPath: string, modelName: string, columnDef: string): void {
    // A required column is just a normal column without a '?' modifier. We can use addColumn for this.
    // However, if the old app doesn't know about it, inserts will fail.
    PrismaMutationEngine.addColumn(schemaPath, modelName, columnDef);
  }

  public static makeNonNull(schemaPath: string, modelName: string, columnName: string): void {
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
          if (parts[1].endsWith('?')) {
            modified = true;
            return line.replace(parts[1], parts[1].slice(0, -1)); // Remove the '?'
          }
        }
        return line;
      });
      return `model ${modelName} {${newLines.join('\n')}}`;
    });

    if (modified) {
      fs.writeFileSync(schemaPath, result, 'utf-8');
    } else {
      throw new Error(
        `Failed to find model '${modelName}' or optional column '${columnName}' in schema.`,
      );
    }
  }

  public static dropTable(schemaPath: string, modelName: string): void {
    const raw = fs.readFileSync(schemaPath, 'utf-8');
    const modelRegex = new RegExp(`model\\s+${modelName}\\s+{([\\s\\S]*?)}\n`, 'g');

    let modified = false;
    const result = raw.replace(modelRegex, (match) => {
      modified = true;
      return ''; // Remove the entire model
    });

    if (modified) {
      fs.writeFileSync(schemaPath, result, 'utf-8');
    } else {
      throw new Error(`Failed to find model '${modelName}' in schema.`);
    }
  }
}
