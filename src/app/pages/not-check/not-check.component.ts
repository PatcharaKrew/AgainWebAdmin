import { Component, OnInit } from '@angular/core';
import { NgZorroModule } from '../../../shared/ng-zorro.module';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../modal/modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { FormControl, FormGroup, FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppointmentService } from '../../appointment.service';

@Component({
  selector: 'app-not-check',
  standalone: true,
  imports: [NgZorroModule, CommonModule, FormsModule,ReactiveFormsModule],
  templateUrl: './not-check.component.html',
  styleUrl: './not-check.component.scss'
})
export class NotCheckComponent implements OnInit {

listOfData: any[] = [];
filteredData: any[] = [];
checked = false;
indeterminate = false;
setOfCheckedId = new Set<number>();
listOfCurrentPageData: readonly any[] = [];
selectedProgram = '';
searchText: string = '';
programs: string[] = [];
isProcessing: boolean = false;

constructor(
  private modal: NzModalService,
  private appointmentService: AppointmentService,
  private fb: NonNullableFormBuilder
) { }

ngOnInit(): void {
  this.loadAppointments();  // ดึงข้อมูลเมื่อคอมโพเนนท์ถูกสร้าง
  this.restoreCheckedState();
}

loadAppointments(): void {
  const today = new Date();

  this.appointmentService.getAppointments().subscribe(
    (data) => {
      // ตรวจสอบและกรองข้อมูลที่ซ้ำกันใน listOfData
      if (data && data.length > 0) {
        const uniqueAppointments = data.filter((appointment, index, self) =>
          index === self.findIndex((t) => (
            t.appointment_date === appointment.appointment_date && t.user_id === appointment.user_id
          ))
        );

        const upcomingAppointments = uniqueAppointments.map(appointment => ({
          ...appointment,
          isProcessing: false // เพิ่มสถานะการประมวลผลเป็น false สำหรับทุกแถว
        })).filter(appointment => new Date(appointment.appointment_date) >= today);

        this.listOfData = upcomingAppointments;
        this.filteredData = upcomingAppointments;
        this.programs = [...new Set(upcomingAppointments.map(item => item.program_name))];
      } else {
        console.error('No data found or data is empty');
      }
    },
    (error) => {
      console.error('Error loading appointments:', error);
    }
  );
}

processSelectedData(selectedData: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (selectedData.length === 0) {
      resolve();
      return;
    }

    selectedData.forEach(data => {
      if (!data.isProcessing) {
        data.isProcessing = true; // ตั้งสถานะการประมวลผล

        // เพิ่มวันใน appointment_date โดยใช้ setDate
        const appointmentDate = new Date(data.appointment_date);
        appointmentDate.setDate(appointmentDate.getDate() + 1);  // เพิ่มอีก 1 วัน

        const requestData = {
          user_id: data.user_id,
          program_name: data.program_name,
          result_program: data.result_program,
          appointment_date: appointmentDate.toISOString().split('T')[0], // แปลงเป็นรูปแบบ YYYY-MM-DD
          is_confirmed: true
        };

        // ส่งข้อมูลไปยัง API
        this.appointmentService.createAppointmentStatus(requestData).subscribe(() => {
          // ลบแถวออกหลังจากที่ส่งข้อมูลสำเร็จ
          this.deleteRow(data.id);
          // ลบข้อมูลจากการเช็ค
          this.setOfCheckedId.delete(data.id);
        }, error => {
          console.error('Error creating appointment status:', error);
        }, () => {
          data.isProcessing = false;  // ยกเลิกสถานะการประมวลผล
        });
      }
    });

    resolve();  // ประมวลผลเสร็จสิ้น
  });
}

onCurrentPageDataChange(listOfCurrentPageData: readonly any[]): void {
  this.listOfCurrentPageData = listOfCurrentPageData;
  this.refreshCheckedStatus();
  this.saveCheckedState();

  const selectedItems = this.listOfCurrentPageData.filter(item => this.setOfCheckedId.has(item.id));
  if (selectedItems.length > 0 && !this.isProcessing) {
    this.processSelectedData(selectedItems);
  }
}

onAllChecked(checked: boolean): void {
  if (this.isProcessing) {
    return;  // หยุดการทำงานหากกำลังประมวลผลอยู่
  }

  // อัปเดตสถานะของการเลือก
  this.listOfCurrentPageData.forEach(({ id }) => this.updateChecked(id, checked));
  this.refreshCheckedStatus();
  this.saveCheckedState();

  // ตรวจสอบข้อมูลที่เลือก
  const selectedItems = this.listOfData.filter(item => this.setOfCheckedId.has(item.id));

  if (selectedItems.length > 0 && !this.isProcessing) {
    this.isProcessing = true;  // ตั้งค่าสถานะกำลังประมวลผล

    // ประมวลผลข้อมูลที่เลือก
    this.processSelectedData(selectedItems).finally(() => {
      this.isProcessing = false;  // ปลดล็อกสถานะเมื่อประมวลผลเสร็จสิ้น
    });
  }
}

refreshCheckedStatus(): void {
  const listOfEnabledData = this.listOfCurrentPageData.filter(({ disabled }) => !disabled);
  this.checked = listOfEnabledData.every(({ id }) => this.setOfCheckedId.has(id));
  this.indeterminate = listOfEnabledData.some(({ id }) => this.setOfCheckedId.has(id)) && !this.checked;
}

onItemChecked(id: number, checked: boolean): void {
  this.updateChecked(id, checked);
  this.refreshCheckedStatus();
  this.saveCheckedState();
}

updateChecked(id: number, checked: boolean): void {
  if (checked) {
    this.setOfCheckedId.add(id);
  } else {
    this.setOfCheckedId.delete(id);
  }
}

filterData(): void {
  const searchTerm = this.searchText.toLowerCase().trim();

  this.filteredData = this.listOfData.filter(item => {
    const fullName = `${item.first_name} ${item.last_name}`.toLowerCase();
    const matchesSearchTerm = (
      fullName.includes(searchTerm) ||
      item.phone?.toLowerCase().includes(searchTerm)
    );

    const matchesProgram = this.selectedProgram ? item.program_name === this.selectedProgram : true;

    return matchesSearchTerm && matchesProgram;
  });
}

viewData(data: any): void {
  const modal = this.modal.create({
    nzTitle: 'ข้อมูลทั้งหมด',
    nzContent: ModalComponent,
    nzFooter: null
  });

  const instance = modal.getContentComponent();
  instance.data = { id: data.id };

  modal.afterClose.subscribe(() => {
    console.log('Modal closed');
  });
}

deleteRow(id: number): void {
  this.appointmentService.deleteAppointment(id).subscribe(() => {
    this.filteredData = this.filteredData.filter(item => item.id !== id);
    this.listOfData = this.listOfData.filter(item => item.id !== id);
    this.saveCheckedState();
  }, error => {
    console.error('Error deleting appointment:', error);
  });
}

saveCheckedState(): void {
  const checkedArray = Array.from(this.setOfCheckedId);
  localStorage.setItem('checkedItems', JSON.stringify(checkedArray));
}

restoreCheckedState(): void {
  const savedCheckedItems = localStorage.getItem('checkedItems');
  if (savedCheckedItems) {
    const checkedArray = JSON.parse(savedCheckedItems);
    this.setOfCheckedId = new Set<number>(checkedArray);
    this.refreshCheckedStatus();
  }
}

}
