"use client";

import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { ImageIcon, Loader2, User } from 'lucide-react';
import type { TemplateConfig, PreviewData } from '@/lib/types';
import { storage } from '@/lib/firebase';
import { getDownloadURL, ref } from 'firebase/storage';
import { verifyCoordinateCalculations, calculateFieldPositions } from '@/lib/utils';


interface TemplatePreviewProps {
  config: TemplateConfig | null;
  previewData?: PreviewData | null;
}

// Import or define getSampleText
function getSampleText(fieldId: string): string {
  const sampleTexts: Record<string, string> = {
    name: "John Doe",
    rollNo: "2024001",
    class: "Class 10",
    contact: "+91 98765 43210",
    address: "123 Main Street, City",
    fatherName: "Father's Name",
    motherName: "Mother's Name",
    dob: "01/01/2000",
    bloodGroup: "O+",
    section: "A",
    admissionNo: "ADM001",
    email: "student@school.com",
    emergencyContact: "Emergency Contact",
    default: "Sample Text"
  };
  return sampleTexts[fieldId] || sampleTexts.default;
}

export function TemplatePreview({ config, previewData }: TemplatePreviewProps) {
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
    const [templateUrl, setTemplateUrl] = useState<string | null>(null);
    const [isLoadingUrl, setIsLoadingUrl] = useState(true);

    useEffect(() => {
        let objectUrl: string | null = null;
        if (previewData?.photo && previewData.photo instanceof File) {
            objectUrl = URL.createObjectURL(previewData.photo);
            setPhotoPreviewUrl(objectUrl);
        } else {
            setPhotoPreviewUrl(null);
        }
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [previewData?.photo]);

    useEffect(() => {
        const fetchTemplateUrl = async () => {
            if (config?.templateImagePath && storage) {
                setIsLoadingUrl(true);
                try {
                    const storageRef = ref(storage, config.templateImagePath);
                    const url = await getDownloadURL(storageRef);
                    setTemplateUrl(url);
                } catch (error) {
                    console.error("Failed to get template URL for preview:", error);
                    setTemplateUrl(null);
                } finally {
                    setIsLoadingUrl(false);
                }
            } else {
                setTemplateUrl(null);
                setIsLoadingUrl(false);
            }
        };

        fetchTemplateUrl();
    }, [config?.templateImagePath]);

    // Enhanced debug logging for coordinate calculations
    useEffect(() => {
        if (config) {
            const templateWidth = config.templateDimensions?.width || 856;
            const templateHeight = config.templateDimensions?.height || 540;
            
            console.log("🎯 SCHOOL DASHBOARD - Template preview using config:", {
                photoPlacement: config.photoPlacement,
                textFields: config.textFields,
                templateImagePath: config.templateImagePath,
                templateDimensions: config.templateDimensions,
                calculatedPercentages: {
                    photo: {
                        left: `${(config.photoPlacement.x / templateWidth) * 100}%`,
                        top: `${(config.photoPlacement.y / templateHeight) * 100}%`,
                        width: `${(config.photoPlacement.width / templateWidth) * 100}%`,
                        height: `${(config.photoPlacement.height / templateHeight) * 100}%`,
                    },
                    textFields: config.textFields.map(field => ({
                        id: field.id,
                        left: `${(field.x / templateWidth) * 100}%`,
                        top: `${(field.y / templateHeight) * 100}%`,
                        fontSize: field.fontSize,
                        fontWeight: field.fontWeight
                    }))
                }
            });
            
            // Verify coordinate calculations
            verifyCoordinateCalculations(config, 'school');
        }
    }, [config]);


  if (isLoadingUrl) {
    return (
        <Card className="flex aspect-[85.6/54] w-full items-center justify-center border-dashed bg-muted/50">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </Card>
    );
  }

  if (!config?.templateImagePath || !templateUrl) {
    return (
      <Card className="flex aspect-[85.6/54] w-full items-center justify-center border-dashed bg-muted/50">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="mx-auto h-12 w-12" />
          <p className="mt-2 font-semibold">No template configured.</p>
          <p className="text-xs">The assigned template will be shown here.</p>
        </div>
      </Card>
    );
  }
  
  const hasData = previewData && Object.values(previewData).some(v => v);
  const templateWidth = config.templateDimensions?.width || 856;
  const templateHeight = config.templateDimensions?.height || 540;

  // Calculate all positions consistently
  const { photoPositions, textPositions } = calculateFieldPositions(config, 'preview');

  return (
    <div className="relative w-full overflow-hidden rounded-lg border">
        <div 
          className="relative w-full"
          style={{
            aspectRatio: `${templateWidth}/${templateHeight}`,
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        >
          <Image
              src={templateUrl}
              alt="ID Card Template"
              width={templateWidth}
              height={templateHeight}
              className="w-full h-full object-contain"
              style={{
                aspectRatio: `${templateWidth}/${templateHeight}`
              }}
              data-ai-hint="id card template"
              priority
          />
          
          {config.photoPlacement && (
               <div
                  className="absolute flex items-center justify-center"
                  style={{
                      left: `${photoPositions.left}%`,
                      top: `${photoPositions.top}%`,
                      width: `${photoPositions.width}%`,
                      height: `${photoPositions.height}%`,
                  }}
              >
                  {photoPreviewUrl ? (
                      <Image src={photoPreviewUrl} alt="User photo preview" layout="fill" objectFit="cover" className="bg-muted" />
                  ) : (
                      <div className="w-full h-full bg-muted/70 flex items-center justify-center text-muted-foreground border-2 border-dashed border-blue-400">
                          {hasData ? <User className="w-1/2 h-1/2 opacity-50" /> : <span className="p-1 text-xs text-blue-800 bg-white/50 rounded-sm">Photo</span>}
                      </div>
                  )}
              </div>
          )}
          {textPositions.map((field) => {
            const text = (previewData?.[field.id] as string) || getSampleText(field.id);
            const configField = config.textFields.find(f => f.id === field.id);
            const color = configField?.color || '#000000';
            const fontFamily = configField?.fontFamily || 'Arial, sans-serif';
            const textAlign = configField?.textAlign || 'left';
            const isAddress = field.id === 'address';

            // Use the exact same positioning logic as the canvas output
            // For center alignment: x is the center point, no transform needed
            // For left alignment: x is the left edge, no transform needed  
            // For right alignment: x is the right edge, no transform needed
            let transform = 'translate(0, 0)';
            const leftPosition = field.left;
            
            // Apply the same logic as canvas rendering
            if (textAlign === 'center') {
              // x is already the center point, no adjustment needed
              transform = 'translate(-50%, 0)';
            } else if (textAlign === 'right') {
              // For right alignment, we need to adjust since our field.left represents the left edge
              // but we want the right edge to be at that position
              transform = 'translate(-100%, 0)';
            }

            return (
              <div
                key={field.id}
                className="absolute"
                style={{
                  left: `${leftPosition}%`,
                  top: `${field.top}%`,
                  fontSize: `${field.fontSize}px`,
                  fontWeight: field.fontWeight,
                  color,
                  fontFamily,
                  whiteSpace: isAddress ? 'pre' : 'pre',
                  textAlign,
                  lineHeight: '1.2',
                  transform,
                  width: 'max-content',
                  maxWidth: '80%',
                }}
              >
                {text}
              </div>
            );
          })}
        </div>
    </div>
  );
}
