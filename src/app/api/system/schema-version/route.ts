import { NextRequest, NextResponse } from 'next/server';
import { SchemaVersionManager } from '@/lib/schema-version';

/**
 * GET - Get current schema version and health status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'health':
        const healthStatus = await SchemaVersionManager.checkSchemaHealth();
        return NextResponse.json({
          success: true,
          health: healthStatus
        });

      case 'history':
        const history = await SchemaVersionManager.getVersionHistory();
        return NextResponse.json({
          success: true,
          history
        });

      case 'current':
      default:
        const currentVersion = await SchemaVersionManager.getCurrentVersion();
        return NextResponse.json({
          success: true,
          current_version: currentVersion
        });
    }

  } catch (error) {
    console.error('Schema version GET error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Add new schema version or initialize versioning
 */
export async function POST(request: NextRequest) {
  try {
    const { action, version, description } = await request.json();

    switch (action) {
      case 'initialize':
        const initVersion = version || '1.0.0';
        const success = await SchemaVersionManager.initializeVersioning(initVersion);
        
        return NextResponse.json({
          success,
          message: success 
            ? `Schema versioning initialized with version ${initVersion}`
            : 'Failed to initialize schema versioning'
        });

      case 'add':
        if (!version || !description) {
          return NextResponse.json(
            { error: 'Missing version or description' },
            { status: 400 }
          );
        }

        if (!SchemaVersionManager.isValidVersionFormat(version)) {
          return NextResponse.json(
            { error: 'Invalid version format. Use semantic versioning (e.g., 1.0.0)' },
            { status: 400 }
          );
        }

        const addSuccess = await SchemaVersionManager.addVersion(version, description);
        
        return NextResponse.json({
          success: addSuccess,
          message: addSuccess 
            ? `Schema version ${version} added successfully`
            : `Failed to add schema version ${version}`
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "initialize" or "add"' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Schema version POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Check version compatibility
 */
export async function PATCH(request: NextRequest) {
  try {
    const { required_version } = await request.json();

    if (!required_version) {
      return NextResponse.json(
        { error: 'Missing required_version' },
        { status: 400 }
      );
    }

    if (!SchemaVersionManager.isValidVersionFormat(required_version)) {
      return NextResponse.json(
        { error: 'Invalid version format' },
        { status: 400 }
      );
    }

    const isCompatible = await SchemaVersionManager.isVersionCompatible(required_version);
    const currentVersion = await SchemaVersionManager.getCurrentVersion();

    return NextResponse.json({
      success: true,
      compatible: isCompatible,
      current_version: currentVersion,
      required_version: required_version,
      message: isCompatible 
        ? 'Schema version is compatible'
        : `Schema version ${currentVersion} is not compatible with required version ${required_version}`
    });

  } catch (error) {
    console.error('Schema version compatibility check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}