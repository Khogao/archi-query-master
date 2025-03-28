
import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { OcrConfig } from '@/hooks/useOcrConfig';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useForm } from 'react-hook-form';

interface OcrConfigPanelProps {
  config: OcrConfig;
  onConfigUpdate: (config: Partial<OcrConfig>) => void;
  readableConfig: {
    resolution: string;
    language: string;
    accuracy: string;
  };
}

export const OcrConfigPanel: React.FC<OcrConfigPanelProps> = ({
  config,
  onConfigUpdate,
  readableConfig
}) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  
  const form = useForm({
    defaultValues: config
  });

  const handleSubmit = (data: OcrConfig) => {
    onConfigUpdate(data);
    setIsDialogOpen(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold">Cấu hình OCR</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cấu hình OCR</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="resolution"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel>Độ phân giải quét</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="low" id="r1" />
                            <Label htmlFor="r1">Thấp (nhanh)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="medium" id="r2" />
                            <Label htmlFor="r2">Trung bình</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="high" id="r3" />
                            <Label htmlFor="r3">Cao (chính xác)</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        Độ phân giải ảnh hưởng đến tốc độ và độ chính xác
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngôn ngữ chính</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn ngôn ngữ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="vietnamese">Tiếng Việt</SelectItem>
                          <SelectItem value="english">Tiếng Anh</SelectItem>
                          <SelectItem value="mixed">Hỗn hợp</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accuracy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ưu tiên</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn ưu tiên" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="speed">Tốc độ</SelectItem>
                          <SelectItem value="balanced">Cân bằng</SelectItem>
                          <SelectItem value="accuracy">Độ chính xác</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit">Lưu cấu hình</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex justify-between items-center w-full text-sm">
          <span>Xem cấu hình hiện tại</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="text-sm mt-2 space-y-1 text-gray-600">
          <div>Độ phân giải: {readableConfig.resolution}</div>
          <div>Ngôn ngữ: {readableConfig.language}</div>
          <div>Ưu tiên: {readableConfig.accuracy}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
