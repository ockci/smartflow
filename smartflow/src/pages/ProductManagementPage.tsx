import { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Plus, Upload, Download, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

interface Product {
  id: number;
  product_code: string;
  product_name: string;
  unit_price?: number;
  unit_cost?: number;
  required_tonnage?: number;
  cycle_time?: number;
  cavity_count: number;
  unit: string;
  min_stock: number;
}

interface ProductManagementPageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function ProductManagementPage({ onNavigate, onLogout }: ProductManagementPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [newProduct, setNewProduct] = useState({
    product_code: '',
    product_name: '',
    unit_price: 0,
    unit_cost: 0,
    required_tonnage: 0,
    cycle_time: 0,
    cavity_count: 1,
    unit: '개',
    min_stock: 0,
  });

  // 제품 목록 조회
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE_URL}/api/products/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error: any) {
      toast.error('제품 목록을 불러오는데 실패했습니다.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 제품 추가/수정
  const handleSaveProduct = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (editingProduct) {
        // 수정
        await axios.put(
          `${API_BASE_URL}/api/products/update/${editingProduct.product_code}`,
          newProduct,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('제품이 수정되었습니다.');
      } else {
        // 추가
        await axios.post(
          `${API_BASE_URL}/api/products/create`,
          newProduct,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('제품이 추가되었습니다.');
      }
      
      setIsDialogOpen(false);
      setEditingProduct(null);
      setNewProduct({
        product_code: '',
        product_name: '',
        unit_price: 0,
        unit_cost: 0,
        required_tonnage: 0,
        cycle_time: 0,
        cavity_count: 1,
        unit: '개',
        min_stock: 0,
      });
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '제품 저장에 실패했습니다.');
      console.error(error);
    }
  };

  // 제품 삭제
  const handleDeleteProduct = async (productCode: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(
     `${API_BASE_URL}/api/products/${productCode}`,
    { headers: { Authorization: `Bearer ${token}` } }
    );
      toast.success('제품이 삭제되었습니다.');
      fetchProducts();
    } catch (error: any) {
      toast.error('제품 삭제에 실패했습니다.');
      console.error(error);
    }
  };

  // 엑셀 업로드
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${API_BASE_URL}/api/products/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      toast.success(response.data.message || '엑셀 업로드 완료');
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '엑셀 업로드 실패');
      console.error(error);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // 수정 버튼 클릭
  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      product_code: product.product_code,
      product_name: product.product_name,
      unit_price: product.unit_price || 0,
      unit_cost: product.unit_cost || 0,
      required_tonnage: product.required_tonnage || 0,
      cycle_time: product.cycle_time || 0,
      cavity_count: product.cavity_count || 1,
      unit: product.unit || '개',
      min_stock: product.min_stock || 0,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar onNavigate={onNavigate} onLogout={onLogout} currentPage="products" />
      
      <div className="flex-1 p-8 ml-64">
        <div className="max-w-7xl mx-auto">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">제품 관리</h1>
            <p className="text-gray-600 mt-2">제품 정보를 등록하고 관리하세요</p>
          </div>

          {/* 액션 버튼 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>제품 등록</CardTitle>
              <CardDescription>엑셀 업로드 또는 개별 추가</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button variant="outline" asChild>
                  <a href={`${API_BASE_URL}/api/products/download/template`} download>
                    <Download className="w-4 h-4 mr-2" />
                    템플릿 다운로드
                  </a>
                </Button>

                <label htmlFor="product-excel-upload">
                  <Button variant="outline" disabled={isUploading} asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploading ? '업로드 중...' : '엑셀 업로드'}
                    </span>
                  </Button>
                </label>
                <input
                  id="product-excel-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                />

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-[#2563EB]"
                      onClick={() => {
                        setEditingProduct(null);
                        setNewProduct({
                          product_code: '',
                          product_name: '',
                          unit_price: 0,
                          unit_cost: 0,
                          required_tonnage: 0,
                          cycle_time: 0,
                          cavity_count: 1,
                          unit: '개',
                          min_stock: 0,
                        });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      제품 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingProduct ? '제품 수정' : '새 제품 추가'}</DialogTitle>
                      <DialogDescription>제품 정보를 입력하세요</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="product-code">제품 코드 *</Label>
                          <Input
                            id="product-code"
                            value={newProduct.product_code}
                            onChange={(e) => setNewProduct({ ...newProduct, product_code: e.target.value })}
                            placeholder="Product_c0"
                            disabled={!!editingProduct}
                          />
                        </div>
                        <div>
                          <Label htmlFor="product-name">제품명 *</Label>
                          <Input
                            id="product-name"
                            value={newProduct.product_name}
                            onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })}
                            placeholder="전자부품 A-100"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="unit-price">판매 단가 (원)</Label>
                          <Input
                            id="unit-price"
                            type="number"
                            value={newProduct.unit_price || ''}
                            onChange={(e) => setNewProduct({ ...newProduct, unit_price: parseFloat(e.target.value) || 0 })}
                            placeholder="5000"
                          />
                        </div>
                        <div>
                          <Label htmlFor="unit-cost">제조 원가 (원)</Label>
                          <Input
                            id="unit-cost"
                            type="number"
                            value={newProduct.unit_cost || ''}
                            onChange={(e) => setNewProduct({ ...newProduct, unit_cost: parseFloat(e.target.value) || 0 })}
                            placeholder="3000"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="required-tonnage">필요 톤수 ⭐</Label>
                          <Input
                            id="required-tonnage"
                            type="number"
                            value={newProduct.required_tonnage || ''}
                            onChange={(e) => setNewProduct({ ...newProduct, required_tonnage: parseInt(e.target.value) || 0 })}
                            placeholder="150"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cycle-time">사이클 타임 (초) ⭐</Label>
                          <Input
                            id="cycle-time"
                            type="number"
                            value={newProduct.cycle_time || ''}
                            onChange={(e) => setNewProduct({ ...newProduct, cycle_time: parseInt(e.target.value) || 0 })}
                            placeholder="30"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cavity-count">캐비티 수 ⭐</Label>
                          <Input
                            id="cavity-count"
                            type="number"
                            value={newProduct.cavity_count || ''}
                            onChange={(e) => setNewProduct({ ...newProduct, cavity_count: parseInt(e.target.value) || 1 })}
                            placeholder="4"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="unit">단위</Label>
                          <Input
                            id="unit"
                            value={newProduct.unit}
                            onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                            placeholder="개"
                          />
                        </div>
                        <div>
                          <Label htmlFor="min-stock">최소 재고</Label>
                          <Input
                            id="min-stock"
                            type="number"
                            value={newProduct.min_stock || ''}
                            onChange={(e) => setNewProduct({ ...newProduct, min_stock: parseInt(e.target.value) || 0 })}
                            placeholder="100"
                          />
                        </div>
                      </div>

                      <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded">
                        ⭐ 표시된 항목은 스케줄링에 필수적인 정보입니다
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
                      <Button onClick={handleSaveProduct} className="bg-[#2563EB]">
                        {editingProduct ? '수정' : '추가'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* 제품 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>제품 목록</CardTitle>
              <CardDescription>
                등록된 제품: {products.length}개
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
                  <p className="mt-4 text-gray-600">로딩 중...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">등록된 제품이 없습니다.</p>
                  <p className="text-sm text-gray-400 mt-2">엑셀 업로드 또는 개별 추가를 이용해주세요.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>제품코드</TableHead>
                        <TableHead>제품명</TableHead>
                        <TableHead className="text-right">판매가</TableHead>
                        <TableHead className="text-right">원가</TableHead>
                        <TableHead className="text-right">필요톤수</TableHead>
                        <TableHead className="text-right">사이클타임</TableHead>
                        <TableHead className="text-right">캐비티</TableHead>
                        <TableHead className="text-right">최소재고</TableHead>
                        <TableHead className="text-center">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.product_code}</TableCell>
                          <TableCell>{product.product_name}</TableCell>
                          <TableCell className="text-right">
                            {product.unit_price ? `₩${product.unit_price.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.unit_cost ? `₩${product.unit_cost.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.required_tonnage ? `${product.required_tonnage}톤` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.cycle_time ? `${product.cycle_time}초` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.cavity_count || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.min_stock || 0}{product.unit}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(product)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProduct(product.product_code)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}