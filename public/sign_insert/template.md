# PDF Signature Template

This folder contains PDF templates with placeholder zones for signatures.

## Signature Placement Rules

### For ≤ 3 signers:
- All signatures are placed **at the bottom** of the document using the reserved space.
- Bottom placements: Left, Center, Right

### For > 3 signers:
- First three signatures go to the **bottom**.
- Remaining signatures are inserted into the **right-hand margin** using the designated space.

## Template Structure

The PDF templates should include:

1. **Bottom signature zones** (3 positions):
   - Position 1: Bottom left (x: 20, y: 250, width: 60, height: 20)
   - Position 2: Bottom center (x: 100, y: 250, width: 60, height: 20)
   - Position 3: Bottom right (x: 180, y: 250, width: 60, height: 20)

2. **Right margin signature zones** (5 positions):
   - Position 1: Top right (x: 250, y: 50, width: 40, height: 15)
   - Position 2: Upper right (x: 250, y: 80, width: 40, height: 15)
   - Position 3: Middle right (x: 250, y: 110, width: 40, height: 15)
   - Position 4: Lower right (x: 250, y: 140, width: 40, height: 15)
   - Position 5: Bottom right margin (x: 250, y: 170, width: 40, height: 15)

## Usage

The signature placement logic automatically:
1. Determines the number of signers
2. Places signatures according to the rules above
3. Generates signature images with signer information
4. Inserts them into the appropriate positions
5. Creates a final signed PDF with all signatures placed correctly

## Implementation

The signature placement is handled by the `pdf-signature.ts` library which:
- Reads the original PDF
- Generates signature images for each signer
- Places signatures according to the placement rules
- Creates verification QR codes
- Outputs a final signed PDF with all signatures properly positioned